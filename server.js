require('dotenv').config()
const express = require('express')
const notion = require("./notion")
const nusmods = require("./nusmods")
const app = express()

app.get('/', (req, res) => {
    res.send("Hi")
})

app.listen(process.env.PORT)