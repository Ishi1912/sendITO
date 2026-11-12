
const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
    {
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        subject: {
            type: String,
            required: true
        },

        content: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "draft",
                "scheduled",
                "sending",
                "sent",
                "failed",
                "cancelled"
            ],
            default: "draft"
        },

        scheduledAt: {
            type: Date,
            default: null
        },

        sentAt: {
            type: Date,
            default: null
        },

        // Number of emails accepted by the SMTP server
        successCount: {
            type: Number,
            default: 0
        },

        // Number of emails rejected or failed during sending
        failedCount: {
            type: Number,
            default: 0
        },

        // Total number of email-sending attempts
        attemptedCount: {
            type: Number,
            default: 0
        },

        attachments: [
            {
                filename: {
                    type: String,
                    required: true
                },

                storedName: {
                    type: String,
                    required: true
                },

                path: {
                    type: String,
                    required: true
                },

                mimetype: {
                    type: String
                },

                size: {
                    type: Number
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

const campaignModel = mongoose.model("Campaign", campaignSchema);

module.exports = campaignModel;
