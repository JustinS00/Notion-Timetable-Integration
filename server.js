import 'dotenv/config';
import express from 'express';
import { deleteAll, deleteBetween, removeDuplicates } from './notion.js';
import { addMyLessons } from './nusmods.js';

const app = express();
app.set("views", "./views")
app.set("view engine", "ejs")
app.use(express.urlencoded({extended: true}))
app.get('/', (req, res) => {
    res.render('index')
})

app.post('/add-timetable', async (req, res) => {
    const {link, academic_year = []} = req.body
    await addMyLessons(link, academic_year)
    res.redirect("/")
})

app.post('/delete-between', async (req, res) => {
    const {start, end = []} = req.body
    await deleteBetween(new Date(start), new Date(end))
    res.redirect("/")
})


app.post('/delete-all', async (req, res) => {
    await deleteAll()
    res.redirect("/")
})

app.post('/remove-duplicates', async (req, res) => {
    await removeDuplicates()
    res.redirect("/")
})

app.listen(process.env.PORT)