require('dotenv').config()
const express = require('express')
const notion = require("./notion")
const nusmods = require("./nusmods")
const app = express()

app.set("views", "./views")
app.set("view engine", "ejs")
app.get('/', (req, res) => {
    res.render('index')
})

app.listen(process.env.PORT)