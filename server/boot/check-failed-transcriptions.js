'use strict'

var LOG = require('pino')({
  prettyPrint: true
})

module.exports = function (app, done) {
    console.log('Checking any failed transcriptions');

    let TranscriptionControl = app.models.TranscriptionControl;

    TranscriptionControl.find({}, (err, found) => {
        for (let t of found) {
            console.log('id: ' + t.id + ' progress: ' + t.progress + ' user ' + t.userId)
        }
    })

    done()
}