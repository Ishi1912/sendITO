const express = require('express');
const path = require('path');
const creatorRoutes = require("./routes/creator.routes")
const authRoutes = require("./routes/auth.routes");
const subscriberRoutes = require("./routes/subscriber.routes");
const campaignRoutes = require("./routes/campaign.routes")
const aiRoutes = require("./routes/ai.routes");
const unsubscribeRoutes = require("./routes/unsubscribe.routes");

const app = express();

app.use(express.json());

// Serves uploaded campaign attachments (and other uploads/) so the frontend
// can show/download the actual file, e.g. /uploads/171234-file.pdf
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/creator', creatorRoutes)
app.use("/api/auth", authRoutes)
app.use('/api/subscriber', subscriberRoutes)
app.use('/api/campaign', campaignRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/unsubscribe', unsubscribeRoutes)


app.get("/", (req, res) => {
    res.send("Welcome To Email Service");
})

app.get("/health", (req, res) => {
    res.json({
        success: true
    })
})


module.exports = app;