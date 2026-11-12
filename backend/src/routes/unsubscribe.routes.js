const express = require("express");
const subscriberModel = require("../models/subscriber.model");
const { readUnsubscribeToken } = require("../utils/unsubscribe");

const router = express.Router();

// Public route (no login): the subscriber clicks the link in the e-mail.
router.get("/:token", async (req, res) => {
    const page = (text) =>
        `<!doctype html><html><body style="font-family:Arial,sans-serif;text-align:center;margin-top:80px"><h2>${text}</h2></body></html>`;
    try {
        const subscriberId = readUnsubscribeToken(req.params.token);
        const subscriber = await subscriberModel.findById(subscriberId);
        if (!subscriber) return res.status(404).send(page("Subscriber not found."));
        if (subscriber.status !== "bounced") {
            subscriber.status = "unsubscribed";
            await subscriber.save();
        }
        return res.send(page("You have been unsubscribed. You will not receive further campaigns."));
    } catch (error) {
        return res.status(400).send(page("This unsubscribe link is not valid."));
    }
});

module.exports = router;
