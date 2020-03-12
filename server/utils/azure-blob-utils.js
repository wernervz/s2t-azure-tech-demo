'use strict'

const path = require("path");
const AzureStorageBlob = require("@azure/storage-blob")
const { AbortController } = require('@azure/abort-controller');
const got = require('got')

const sharedKeyCredential = new AzureStorageBlob.StorageSharedKeyCredential(process.env.AZURE_STORAGE_ACCOUNT_NAME, process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);

const blobServiceClient = new AzureStorageBlob.BlobServiceClient(
    `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential
);

const ONE_MINUTE = 60 * 1000;
const aborter = AbortController.timeout(30 * ONE_MINUTE);

function AzureBlobUtilsInternal() { }

AzureBlobUtilsInternal.prototype.getBlobAsString = async function (containerName, blobName) {

    var containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadBlockBlobResponse = await blobClient.download();

    const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
    
    return downloaded

    // [Node.js only] A helper method used to read a Node.js readable stream into string
    async function streamToString(readableStream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            readableStream.on("data", (data) => {
                chunks.push(data.toString());
            });
            readableStream.on("end", () => {
                resolve(chunks.join(""));
            });
            readableStream.on("error", reject);
        });
    }
}

AzureBlobUtilsInternal.prototype.exists = async function (containerName, fileName) {
    var containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(fileName);

    let isExists = await blobClient.exists()

    return isExists
}

AzureBlobUtilsInternal.prototype.deleteBlob = async function (containerName, blobName) {

    const blobExists = await this.exists(containerName, blobName);
    let deleteResponse = {
        msg: 'File does not exist.'
    }
    if (blobExists) {
        var containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
    
        deleteResponse = await blobClient.delete()    
    }

    return deleteResponse
}

AzureBlobUtilsInternal.prototype.listContainerContent = async function (containerName) {
    var containerClient = blobServiceClient.getContainerClient(containerName);
    var response = []
    for await (const blob of containerClient.listBlobsFlat()) {
        response.push({ name: blob.name, blob: blob })
    }
    return response
}

AzureBlobUtilsInternal.prototype.uploadLocalFile = async function (containerName, fileName) {

    let filePath = path.resolve(process.env.LOCAL_UPLOAD_DIR + fileName);

    console.log('Upload ' + filePath + ' to container ' + containerName)

    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobClient = containerClient.getBlobClient(fileName);
    const blockBlobClient = blobClient.getBlockBlobClient();

    return await blockBlobClient.uploadFile(filePath, aborter);
}

AzureBlobUtilsInternal.prototype.getBlobSAS = function(containerName, blobName) {

    let startsOn = new Date()
    let expiresOn = new Date(new Date().valueOf() + 300000)

    const blobSAS = AzureStorageBlob.generateBlobSASQueryParameters({
                containerName: containerName, // Required
                blobName: blobName, // Required
                permissions: AzureStorageBlob.BlobSASPermissions.parse("r"), // Required
                startsOn: startsOn, // Required
                expiresOn: expiresOn, // Optional. Date type
            },
            sharedKeyCredential // StorageSharedKeyCredential - `new StorageSharedKeyCredential(account, accountKey)`
        ).toString();

    let url = process.env.AZURE_STORAGE_URL + containerName + '/' + blobName + '?' + blobSAS

    return { asUrl: url }
}

AzureBlobUtilsInternal.prototype.getContainerSAS = function(containerName) {

    let startsOn = new Date()
    let expiresOn = new Date(new Date().valueOf() + 300000)

    // Generate service level SAS for a container
    const containerSAS = AzureStorageBlob.generateBlobSASQueryParameters({
        containerName: containerName, // Required
        permissions: AzureStorageBlob.ContainerSASPermissions.parse("racwl"), // Required
        startsOn: startsOn, // Required
        expiresOn: expiresOn // Optional. Date type
        },
        sharedKeyCredential // StorageSharedKeyCredential - `new StorageSharedKeyCredential(account, accountKey)`
    ).toString();

    let url = process.env.AZURE_STORAGE_URL + containerName + '?' + containerSAS

    return { asUrl: url }
    
}

module.exports = new AzureBlobUtilsInternal();