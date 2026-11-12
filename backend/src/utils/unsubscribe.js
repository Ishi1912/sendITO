const jwt = require("jsonwebtoken");

// Builds the public unsubscribe link placed at the bottom of every campaign e-mail.
// The token is signed with JWT_SECRET, so a link cannot be guessed or edited.
function makeUnsubscribeUrl(subscriberId) {
    const base = process.env.APP_BASE_URL || "http://localhost:3000";
    const token = jwt.sign(
        { sid: String(subscriberId), purpose: "unsubscribe" },
        process.env.JWT_SECRET
    );
    return `${base}/api/unsubscribe/${token}`;
}

function readUnsubscribeToken(token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "unsubscribe") throw new Error("Wrong token");
    return payload.sid;
}

module.exports = { makeUnsubscribeUrl, readUnsubscribeToken };
