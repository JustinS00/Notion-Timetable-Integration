require('dotenv').config()
const express = require('express')
const notion = require("./notion")
const nusmods = require("./nusmods")
const app = express()
const {deleteAll} = require("./notion")
const {addMyLessons} = require("./nusmods")

app.set("views", "./views")
app.set("view engine", "ejs")
app.use(express.urlencoded({extended: true}))
app.get('/', (req, res) => {
    res.render('index')
})

app.post('/add-timetable', async (req, res) => {
    const { link, start_date = [] } = req.body
    await addMyLessons(link)
    res.redirect("/")
})

app.post('/delete-all', async (req, res) => {
    await deleteAll()
    res.redirect("/")
})

app.listen(process.env.PORT)