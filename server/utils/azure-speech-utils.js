'use strict'

const got = require('got');
const AzureBlobUtilsInternal = require('./azure-blob-utils')

var AzureSpeechUtilsLocal = function() {}

AzureSpeechUtilsLocal.prototype.getTranscription = async function (reference) {
}

AzureSpeechUtilsLocal.prototype.getTranscriptionStatus = async function (reference) {
    let options = {
        headers: {
            'Ocp-Apim-Subscription-Key': process.env.STT_ACCESS_KEY,
            'Content-Type': 'application/json'
        },
        responseType: 'json',
        resolveBodyOnly: false
    }

    let statusResponse = await got.get(reference, options)

    return statusResponse.body
}

AzureSpeechUtilsLocal.prototype.submitBatchTranscription = async function (fileName) {
    // Get the SAS Tokens for the Audio input blob and the output container
    let blobSAS = AzureBlobUtilsInternal.getBlobSAS(process.env.AZURE_STORAGE_AUDIO_CONTAINER, fileName)
    let containerSAS = AzureBlobUtilsInternal.getContainerSAS(process.env.AZURE_STORAGE_TRANSCRIPT_CONTAINER)

    // Construct the request
    let triggerRequest = {
        'recordingsUrls': [
            blobSAS.asUrl
        ],
        'locale': 'en-US',
        'name': fileName,
        'description': 'Transcription of file ' + fileName,
        'properties': {
            'ProfanityFilterMode': 'Tags',
            'PunctuationMode': 'DictatedAndAutomatic',
            'AddWordLevelTimestamps': 'True',
            'AddSentiment': 'True',
            'AddDiarization': 'True',
            'TranscriptionResultsContainerUrl': containerSAS.asUrl
        }
    }

    // Construct the http (got) request
    let options = {
        headers: {
            'Ocp-Apim-Subscription-Key': process.env.STT_ACCESS_KEY,
            'Content-Type': 'application/json'
        },
        json: triggerRequest,
        responseType: 'json',
        resolveBodyOnly: false
    }

    let triggerResponse = await got.post('https://eastus.cris.ai/api/speechtotext/v2.1/transcriptions', options)

    return { success: triggerResponse.statusCode < 300, reference: triggerResponse.headers.location }
}

module.exports = new AzureSpeechUtilsLocal()