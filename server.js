const express = require('express');
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold
} = require("@google/generative-ai");
const jsPDF = require('jspdf');
const dotenv = require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const MODEL_NAME = "gemini-1.0-pro";
const API_KEY = process.env.API_KEY;

async function sendMessage(userInput) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
        temperature: 1,
        topK: 0,
        topP: 0.95,
        maxOutputTokens: 8192,
    };

    const safetySettings = [{
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];

    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [{
                role: "user",
                parts: [{ text: "What is your name?" }],
            },
            {
                role: "model",
                parts: [{ text: "As a PolicyPro AI ChatBot, I am here to assist you with generating acceptable use policies for various contexts, including employees, students, vendors, network security, wireless security, and email usage. Do you have a specific policy you would like to generate or any questions about acceptable use policies in general?" }],
            },
            {
                role: "user",
                parts: [{ text: "What is your name?" }],
            },
            {
                role: "model",
                parts: [{ text: "I apologize if I didn't answer your question clearly. I am not a person with a personal name. You can consider me as PolicyPro AI ChatBot, specifically designed to assist the VIT Bhopal University community." }],
            },
        ],
    });

    const result = await chat.sendMessage(userInput);
    const response = result.response;

    // Process the response text to replace bold markers with HTML bold tags
    const processedBotMessage = response.text().replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    // Process the response text to replace newlines with HTML line breaks
    const processedBotMessageWithBreaks = processedBotMessage.replace(/\n/g, "<br>");

    return processedBotMessageWithBreaks;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/loader.gif', (req, res) => {
    res.sendFile(__dirname + '/loader.gif');
});

app.post('/chat', async(req, res) => {
    try {
        const userInput = req.body.userInput;
        console.log('incoming /chat req', userInput)
        if (!userInput) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const responseText = await sendMessage(userInput);
        res.json({ response: responseText });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/download-pdf', async(req, res) => {
    try {
        let chatHistory = req.query.chatHistory;

        const doc = new jsPDF();
        doc.html(chatHistory, {
            callback: function(pdf) {
                // Set headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="chat_history.pdf"');

                // Send PDF as response
                res.send(pdf.output());
            }
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});