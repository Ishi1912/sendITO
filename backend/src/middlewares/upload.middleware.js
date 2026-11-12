const multer = require("multer");

const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "uploads/");
    },

    filename: function(req, file, cb){
        // Date.now() alone can collide when several files are uploaded in the
        // same request (same millisecond), so a random suffix is added to
        // keep every stored filename unique while still keeping the real
        // name (file.originalname, not originalName) recoverable.
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    }

});

const upload = multer({
    storage
});

// Separate instance used for campaign attachments (file/image upload while
// composing a campaign): caps file size and count so a mistaken upload
// can't fill the server's disk.
const attachmentUpload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 5
    }
});

module.exports = upload;
module.exports.attachmentUpload = attachmentUpload;