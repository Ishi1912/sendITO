const { makeUnsubscribeUrl } = require("../utils/unsubscribe");

const campaignModel = require("../models/campaign.model");
const subscriberModel = require("../models/subscriber.model");
const mongoose = require("mongoose");
const emailService = require("../services/email.service");
const fs = require("fs");

async function createCampaign(req, res) {
    try {
        const { subject, content } = req.body;
        const creatorId = req.user.id;

        const campaign = await campaignModel.create({
            creatorId,
            subject,
            content
        });

        return res.status(201).json({
            success: true,
            message: "Campaign created successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function getCampaigns(req, res) {
    try {
        const campaigns = await campaignModel.find({
            creatorId: req.user.id
        });

        return res.status(200).json({
            success: true,
            count: campaigns.length,
            data: campaigns
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function getCampaignById(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function updateCampaign(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOneAndUpdate(
            {
                _id: id,
                creatorId: req.user.id
            },
            req.body,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: campaign,
            message: "Campaign Updated Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function deleteCampaign(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOneAndDelete({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Campaign Deleted Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// UPDATED SEND CAMPAIGN FUNCTION
async function sendCampaign(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.status === "sent") {
            return res.status(400).json({
                success: false,
                message: "Campaign has already been sent"
            });
        }

        if (campaign.status === "sending") {
            return res.status(409).json({
                success: false,
                message: "Campaign is already being sent"
            });
        }

        const subscribers = await subscriberModel.find({
            creatorId: req.user.id,
            status: "active"
        });

        if (subscribers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active subscribers found"
            });
        }

        const attachments = (campaign.attachments || []).map((a) => ({
            filename: a.filename,
            path: a.path
        }));

        // Reset delivery statistics before sending.
        campaign.status = "sending";
        campaign.successCount = 0;
        campaign.failedCount = 0;
        campaign.attemptedCount = 0;
        campaign.sentAt = null;

        await campaign.save();

        let successCount = 0;
        let failedCount = 0;
        let attemptedCount = 0;

        for (const subscriber of subscribers) {
            attemptedCount++;

            try {
                await emailService.sendEmail(
                    subscriber.email,
                    campaign.subject,
                    campaign.content,
                    attachments,
                    makeUnsubscribeUrl(subscriber._id)
                );

                successCount++;

            } catch (error) {
                failedCount++;

                // A permanent SMTP error means the address is bad: mark it bounced.
                if (error.permanent) {
                    await subscriberModel.updateOne(
                        { _id: subscriber._id },
                        { status: "bounced" }
                    );
                }

                console.error(
                    `Failed to send email to ${subscriber.email}:`,
                    error.message
                );
            }

            // Save updated statistics after every attempt.
            campaign.successCount = successCount;
            campaign.failedCount = failedCount;
            campaign.attemptedCount = attemptedCount;

            await campaign.save();
        }

        // Final campaign status.
        campaign.successCount = successCount;
        campaign.failedCount = failedCount;
        campaign.attemptedCount = attemptedCount;

        campaign.status = successCount > 0 ? "sent" : "failed";
        campaign.sentAt = successCount > 0 ? new Date() : null;

        await campaign.save();

        const message =
            `Campaign processing completed. Successful: ${successCount}, ` +
            `Failed: ${failedCount}, Total attempts: ${attemptedCount}.`;

        if (successCount === 0) {
            return res.status(502).json({
                success: false,
                message: "No emails were accepted by the email service.",
                data: {
                    successCount,
                    failedCount,
                    attemptedCount,
                    status: campaign.status
                }
            });
        }

        return res.status(200).json({
            success: true,
            message,
            data: {
                successCount,
                failedCount,
                attemptedCount,
                status: campaign.status
            }
        });

    } catch (error) {
        console.error("Campaign sending error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function scheduleCampaign(req, res) {
    try {
        const id = req.params.id;
        const { scheduledAt } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        if (!scheduledAt) {
            return res.status(400).json({
                success: false,
                message: "Scheduled time is required"
            });
        }

        const scheduleTime = new Date(scheduledAt);

        if (isNaN(scheduleTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid scheduled time"
            });
        }

        if (scheduleTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Scheduled time must be in the future"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.status === "sent") {
            return res.status(400).json({
                success: false,
                message: "Campaign has already been sent"
            });
        }

        campaign.status = "scheduled";
        campaign.scheduledAt = scheduleTime;

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "Campaign scheduled successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function cancelCampaign(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.status !== "scheduled") {
            return res.status(400).json({
                success: false,
                message: "Only scheduled campaigns can be cancelled"
            });
        }

        campaign.status = "cancelled";

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "Campaign cancelled successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function rescheduleCampaign(req, res) {
    try {
        const id = req.params.id;
        const { scheduledAt } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        if (!scheduledAt) {
            return res.status(400).json({
                success: false,
                message: "Scheduled time is required"
            });
        }

        const scheduleTime = new Date(scheduledAt);

        if (isNaN(scheduleTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid scheduled time"
            });
        }

        if (scheduleTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "Scheduled time must be in the future"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.status !== "scheduled") {
            return res.status(400).json({
                success: false,
                message: "Only scheduled campaigns can be rescheduled"
            });
        }

        campaign.scheduledAt = scheduleTime;

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "Campaign rescheduled successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function uploadAttachments(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded"
            });
        }

        const newAttachments = req.files.map((file) => ({
            filename: file.originalname,
            storedName: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size
        }));

        campaign.attachments.push(...newAttachments);

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "Attachments uploaded successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function removeAttachment(req, res) {
    try {
        const { id, attachmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Campaign ID"
            });
        }

        const campaign = await campaignModel.findOne({
            _id: id,
            creatorId: req.user.id
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        const attachment = campaign.attachments.id(attachmentId);

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: "Attachment not found"
            });
        }

        const filePath = attachment.path;
        attachment.deleteOne();

        await campaign.save();

        // Best-effort disk cleanup.
        fs.unlink(filePath, () => {});

        return res.status(200).json({
            success: true,
            message: "Attachment removed successfully",
            data: campaign
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    scheduleCampaign,
    cancelCampaign,
    rescheduleCampaign,
    uploadAttachments,
    removeAttachment
};
