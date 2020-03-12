"use strict";

const multer = require("multer");
const fs = require("fs");
const got = require("got");
const url = require("url");

const AzureBlobUtilsInternal = require("../utils/azure-blob-utils");
const AzureSpeechUtilsLocal = require("../utils/azure-speech-utils");
const Poller = require("../utils/poller");

module.exports = function(TranscriptionControl) {
  var uploadedFileName = "";

  var storage = multer.diskStorage({
    destination: function(req, file, cb) {
      // checking and creating uploads folder where files will be uploaded
      var dirPath = "uploads";
      if (!fs.existsSync(dirPath)) {
        var dir = fs.mkdirSync(dirPath);
      }
      cb(null, dirPath + "/");
    },
    filename: function(req, file, cb) {
      uploadedFileName = file.originalname;
      cb(null, file.originalname);
    }
  });

  TranscriptionControl.findOwnedById = async function (id, options) {
    let found = await this.find({ where: { and: [ { id: id }, { userId: options.accessToken.userId }]}}, { limit: 1 });
    return found.length > 0 ? found[0] : {};
  }
  
  TranscriptionControl.transcribeAudio = async function(req, res, options) {
    // Save the uploaded file to the uploads directory
    let uploadToLocalOutcome = await uploadFileToLocal(req, res);

    // First check if the filename was previously uploaded
    let fileName = uploadToLocalOutcome.fileName;
    let exists = await AzureBlobUtilsInternal.exists(process.env.AZURE_STORAGE_AUDIO_CONTAINER, fileName);
    if (exists) {
      
      const existingTranscriptControlInstance = this.find({ where: { fileName: fileName }});
      // If it does not belong to the same user, then throw an error
      if (existingTranscriptControlInstance.length > 0) {
        if (existingTranscriptControlInstance[0].userId != options.accessToken.userId) {
          fs.unlinkSync(process.env.LOCAL_UPLOAD_DIR + uploadToLocalOutcome.fileName);

          const fileAlreadyExist = new Error(
            'The uploaded file already exist and cannot be uploaded again.'
          );
          fileAlreadyExist.status = 400;
          throw fileAlreadyExist;  
        } else {
          // Otherwise clean up the resources and process it again.
          let cleanedUp = await this.cleanupExistingResources(id, options)
        }
      }
    }
    
    if (!uploadToLocalOutcome.success) {
      return res.json(uploadToLocalOutcome);
    }
    
    var transcriptionControlInstance = await this.create({
      userId: options.accessToken.userId,
      fileName: uploadToLocalOutcome.fileName,
      progress: "UPLOAD_LOCAL"
    });

    // Upload the file to Azure
    let uploadToAzureOutcome = await AzureBlobUtilsInternal.uploadLocalFile(
      process.env.AZURE_STORAGE_AUDIO_CONTAINER,
      uploadToLocalOutcome.fileName
    );

    transcriptionControlInstance.progress = "UPLOAD_AZURE";
    transcriptionControlInstance.save();

    // Remove file from Local
    fs.unlinkSync(process.env.LOCAL_UPLOAD_DIR + uploadToLocalOutcome.fileName);

    // Trigger the Batch Speech to text
    let submitBatchTranscriptionOutcome = await AzureSpeechUtilsLocal.submitBatchTranscription(
      uploadToLocalOutcome.fileName
    );

    transcriptionControlInstance.progress = "QUEUED";
    transcriptionControlInstance.reference =
      submitBatchTranscriptionOutcome.reference;
    transcriptionControlInstance.save();

    // This will return immediately and then continue to monitor.
    await monitorTranscriptionUntilComplete(transcriptionControlInstance);

    return transcriptionControlInstance;
  };

  TranscriptionControl.cleanupExistingResources = async function(id, options) {
    
    let transcriptionControlInstance = await this.findById(id);

    if (options.accessToken.userId != process.env.ADMIN_ID && transcriptionControlInstance.userId != options.accessToken.userId) {
      const noAccessError = new Error(
        'Resources belong to another user.'
      );
      noAccessError.status = 401;
      throw noAccessError;
    }
    
    let response = {};
    if (!transcriptionControlInstance) {
      return {
        msg: "Transcription does not exist."
      };
    }

    // 1. Delete the audio file
    let deleteBlobOutcome = await AzureBlobUtilsInternal.deleteBlob(
      process.env.AZURE_STORAGE_AUDIO_CONTAINER,
      transcriptionControlInstance.fileName
    );
    response.deleteAudioOutcome = deleteBlobOutcome;

    // 2. Delete Transcription Results from Azure
    if (transcriptionControlInstance.status && transcriptionControlInstance.status.results[0] && transcriptionControlInstance.status.results[0].resultUrls[0]) {
      
      let transcriptionResultsUrl = transcriptionControlInstance.status.results[0].resultUrls[0].resultUrl;
      let blobPath = url.parse(transcriptionResultsUrl).pathname;
      let folderName = blobPath.split("/")[2];
      let fileName = blobPath.split("/")[3];
  
      let deleteTranscriptionOutcome = await AzureBlobUtilsInternal.deleteBlob(
        process.env.AZURE_STORAGE_TRANSCRIPT_CONTAINER,
        folderName + "/" + fileName);
      response.deleteTranscriptOutcome = deleteTranscriptionOutcome;  
    }

    let deleteTranscriptionControlOutcome = await TranscriptionControl.destroyById(id);
    response.deleteTranscriptionControlOutcome = deleteTranscriptionControlOutcome;

    return response;
  };

  TranscriptionControl.getAudioUrl = async function getAudioUrl(id, options) {
    let transcriptionControlInstance = await this.findById(id);
    if (transcriptionControlInstance.userId != options.accessToken.userId) {
      const noAccessError = new Error(
        'Resources belong to another user.'
      );
      noAccessError.status = 401;
      throw noAccessError;
    }

    if (!transcriptionControlInstance) {
      return {};
    }
    let blobName = transcriptionControlInstance.status.name;

    let blobSAS = AzureBlobUtilsInternal.getBlobSAS(
      process.env.AZURE_STORAGE_AUDIO_CONTAINER,
      blobName
    );

    return { url: blobSAS.asUrl };
  };

  function retrieveTranscriptionResults(transcriptionControlInstance) {
    return new Promise(async (resolve, reject) => {
      let transcriptionStatus = await AzureSpeechUtilsLocal.getTranscriptionStatus(
        transcriptionControlInstance.reference
      );

      if (transcriptionStatus.results.length === 0) {
        resolve({});
      }

      let transcriptionResultsUrl =
        transcriptionStatus.results[0].resultUrls[0].resultUrl;

      let transcriptionResultsPath = url.parse(transcriptionResultsUrl)
        .pathname;
      let containerName = transcriptionResultsPath.split("/")[1];
      let folderName = transcriptionResultsPath.split("/")[2];
      let fileName = transcriptionResultsPath.split("/")[3];

      let getBlobAsStringOutcome = await AzureBlobUtilsInternal.getBlobAsString(
        containerName,
        folderName + "/" + fileName
      );

      resolve({
        url: transcriptionResultsUrl,
        path: transcriptionResultsPath,
        containerName: transcriptionResultsPath.split("/")[1],
        folderName: transcriptionResultsPath.split("/")[2],
        fileName: transcriptionResultsPath.split("/")[3],
        transcript: JSON.parse(getBlobAsStringOutcome)
      });
    });
  }

  function monitorTranscriptionUntilComplete(transcriptionControlInstance) {
    return new Promise(async (resolve, reject) => {
      // Immediately return
      resolve();
      // Start a Poller to check on the status
      let poller = new Poller(30000);

      poller.onPoll(async () => {
        console.log("Checking Transcription Status.");

        let transcriptionStatus = await AzureSpeechUtilsLocal.getTranscriptionStatus(
          transcriptionControlInstance.reference
        );

        transcriptionControlInstance.status = transcriptionStatus;
        transcriptionControlInstance.progress = "RUNNING ";
        transcriptionControlInstance.save();

        if (
          transcriptionStatus.status == "Succeeded" ||
          transcriptionStatus.status == "Failed"
        ) {
          let retrieveTranscriptionResultsOutcome = await retrieveTranscriptionResults(transcriptionControlInstance);

          transcriptionControlInstance.progress = "COMPLETE";
          transcriptionControlInstance.transcription = retrieveTranscriptionResultsOutcome;
          transcriptionControlInstance.save();
          // 2. Delete Transcription Results from Azure
          let transcriptionResultsUrl =
            transcriptionControlInstance.status.results[0].resultUrls[0].resultUrl;
          let blobPath = url.parse(transcriptionResultsUrl).pathname;
          let folderName = blobPath.split("/")[2];
          let fileName = blobPath.split("/")[3];

          let deleteTranscriptionOutcome = await AzureBlobUtilsInternal.deleteBlob(
            process.env.AZURE_STORAGE_TRANSCRIPT_CONTAINER,
            folderName + "/" + fileName
          );
          // And Exit
        } else {
          poller.poll(); // Go for the next poll
        }
      });

      // Initial start
      poller.poll();
    });
  }

  function uploadFileToLocal(req, res) {
    return new Promise((resolve, reject) => {
      var upload = multer({
        storage: storage
      }).array("file", 1);
      upload(req, res, err => {
        if (err) {
          // An error occurred when uploading
          reject({ success: false, error: err });
        } else {
          resolve({ success: true, fileName: uploadedFileName });
        }
      });
    });
  }

  TranscriptionControl.remoteMethod("findOwnedById", {
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true
      },
      { arg: 'options', type: 'object', http: 'optionsFromRequest' }
    ],
    returns: { arg: "body", type: "object", root: true },
    http: { verb: "get" }
  })
  TranscriptionControl.remoteMethod("transcribeAudio", {
    accepts: [
      {
        arg: "req",
        type: "object",
        http: {
          source: "req"
        }
      },
      {
        arg: "res",
        type: "object",
        http: {
          source: "res"
        },
      },
      { arg: 'options', type: 'object', http: 'optionsFromRequest' }
    ],
    returns: { arg: "body", type: "object", root: true }
  });
  TranscriptionControl.remoteMethod("cleanupExistingResources", {
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true
      },
      { arg: 'options', type: 'object', http: 'optionsFromRequest' }
    ],
    returns: { arg: "body", type: "object", root: true },
    http: { verb: "delete" }
  });
  TranscriptionControl.remoteMethod("getAudioUrl", {
    accepts: [
      {
        arg: "id",
        type: "string",
        required: true
      },
      { arg: 'options', type: 'object', http: 'optionsFromRequest' }
    ],
    returns: { arg: "body", type: "object", root: true },
    http: { verb: "get" }
  });

  TranscriptionControl.beforeRemote('*', function (context, unused, next) {
    // throw error if required info is not provided
    if (!context.req.accessToken) {
      const noCurrentAccessTokenError = new Error(
        'The request does not contain current accessToken information'
      );
      noCurrentAccessTokenError.status = 401;
      throw noCurrentAccessTokenError;
    }
    // put the data into the 'options' key
    if (!context.args.options) context.args.options = {};
    context.args.options.accessToken = context.req.accessToken;
    next();
  });

  TranscriptionControl.observe('access', async function(context) {
    if (context.options && context.options.accessToken && context.options.accessToken.userId == process.env.ADMIN_ID) return;

    if (!context.query) {
      context.query = { where: { userId : context.options.accessToken.userId }}
    } else {
      if (!context.query.where) {
        context.query.where = {}
        context.query.where.userId = context.options.accessToken.userId
      }
    }
    
    return;
  });
};
