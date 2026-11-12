const { makeUnsubscribeUrl } = require("../utils/unsubscribe");

const cron = require("node-cron");
const campaignModel = require("../models/campaign.model");
const subscriberModel = require("../models/subscriber.model");
const emailService = require("./email.service");

function startCampaignScheduler() {
    cron.schedule("* * * * *", async () => {
        try {
            // Find campaigns whose scheduled time has arrived
            const campaigns = await campaignModel.find({
                status: "scheduled",
                scheduledAt: {
                    $lte: new Date()
                }
            });

            for (const campaign of campaigns) {
                try {
                    // Atomically claim the campaign so another scheduler
                    // run does not process it at the same time.
                    const claimedCampaign = await campaignModel.findOneAndUpdate(
                        {
                            _id: campaign._id,
                            status: "scheduled"
                        },
                        {
                            $set: {
                                status: "sending",
                                successCount: 0,
                                failedCount: 0,
                                attemptedCount: 0,
                                sentAt: null
                            }
                        },
                        {
                            new: true
                        }
                    );

                    // Another scheduler run may already have claimed it
                    if (!claimedCampaign) {
                        continue;
                    }

                    console.log(
                        `Sending scheduled campaign: ${claimedCampaign.subject}`
                    );

                    // Find all active subscribers for this creator
                    const subscribers = await subscriberModel.find({
                        creatorId: claimedCampaign.creatorId,
                        status: "active"
                    });

                    // If there are no active subscribers, mark campaign failed
                    if (subscribers.length === 0) {
                        claimedCampaign.status = "failed";
                        claimedCampaign.successCount = 0;
                        claimedCampaign.failedCount = 0;
                        claimedCampaign.attemptedCount = 0;

                        await claimedCampaign.save();

                        console.log(
                            `No active subscribers for campaign ${claimedCampaign._id}`
                        );

                        continue;
                    }

                    // Prepare campaign attachments
                    const attachments = (
                        claimedCampaign.attachments || []
                    ).map((attachment) => ({
                        filename: attachment.filename,
                        path: attachment.path
                    }));

                    let successCount = 0;
                    let failedCount = 0;
                    let attemptedCount = 0;

                    // Send campaign email to each active subscriber
                    for (const subscriber of subscribers) {
                        attemptedCount++;

                        try {
                            await emailService.sendEmail(
                                subscriber.email,
                                claimedCampaign.subject,
                                claimedCampaign.content,
                                attachments,
                                makeUnsubscribeUrl(subscriber._id)
                            );

                            successCount++;

                            console.log(
                                `Email accepted for: ${subscriber.email}`
                            );

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

                        // Save updated statistics after every attempt
                        claimedCampaign.successCount = successCount;
                        claimedCampaign.failedCount = failedCount;
                        claimedCampaign.attemptedCount = attemptedCount;

                        await claimedCampaign.save();
                    }

                    // Set final campaign status
                    if (successCount > 0) {
                        claimedCampaign.status = "sent";
                        claimedCampaign.sentAt = new Date();
                    } else {
                        claimedCampaign.status = "failed";
                        claimedCampaign.sentAt = null;
                    }

                    await claimedCampaign.save();

                    console.log(
                        `Campaign ${claimedCampaign._id} completed. ` +
                        `Attempted: ${attemptedCount}, ` +
                        `Sent: ${successCount}, ` +
                        `Failed: ${failedCount}`
                    );

                } catch (campaignError) {
                    console.error(
                        `Error processing campaign ${campaign._id}:`,
                        campaignError.message
                    );

                    // Mark the campaign failed if an unexpected error
                    // occurs while processing it.
                    await campaignModel.findOneAndUpdate(
                        {
                            _id: campaign._id,
                            status: "sending"
                        },
                        {
                            $set: {
                                status: "failed"
                            }
                        }
                    );
                }
            }

        } catch (error) {
            console.error(
                "Campaign scheduler error:",
                error.message
            );
        }
    });

    console.log("Campaign scheduler started");
}

module.exports = {
    startCampaignScheduler
};
