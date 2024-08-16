import fetch from 'node-fetch';
import {createTask} from './notion.js';
//mm-dd-yyyy
const STARTING_DATES = {
    "2024-2025": ["08-12-2024","01-13-2025","05-12-2025","06-23-2025"],
    "2025-2026": ["08-11-2025","01-12-2026","05-11-2026","06-22-2026"],
}

const SEMESTER = {
    "sem-1": 1,
    "sem-2": 2,
    "st-i": 3,
    "st-ii": 4,
}

function getSemester(context) {
    const pattern = /https:\/\/nusmods.com\/timetable\/(.*)\/share\?(.*)/
    if (pattern.test(context)) {
        const matches = context.match(pattern)
        const sem = matches[1]
        if (sem in SEMESTER) {
            return SEMESTER[sem]
        }
    }
    
    //const sem = context.match(/sem-(.*)\/share?/)[1];
    //return sem;
}
function getModules(context) {
    const pattern = /https:\/\/nusmods.com\/timetable\/(.*)\/share\?(.*)/
    if (pattern.test(context)) {
        const matches = context.match(pattern)
        const mods = matches[2]
        return mods
    }
}

async function getModuleInfo(year, module_code) {
    const path = [process.env.NUS_MODS_API] + year + "/modules/" + module_code + ".json";
    console.log(path);
    
    try {
        const response = await fetch(path)
        const data = await response.json()
        console.log(module_code + " is successfully retrived")
        return data
    } catch (error) {
        return console.log("Warning: " + error)
    }
}

function getMyModules(link) {
    const separator = "&";
    const mods = getModules(link).split(separator);
    var res = {};
    for (let i = 0; i < mods.length; i++) {
        const mod = mods[i];
        const modName = mod.match(/(.*)=/)[1];
        res[modName] = {};
        const modLessons = mod.match(/=(.*)/)[1].split(",");
        for (let j = 0; j < modLessons.length; j++) {
            try {
                const lessonName = modLessons[j].match(/(.*):/)[1];
                const lessonNo = modLessons[j].match(/:(.*)/)[1];
                res[modName][lessonName] = lessonNo;
            } catch {
                console.log("Mod does not have any lesson");
            }
        }
    }
    return res
}

export function addMyLessons(link, academic_year) {
    const sem = getSemester(link);
    const modList = getMyModules(link);;
    const res = {};
    for (const[k,v] of Object.entries(modList)) {
        res[k] = {};
        const modData = getModuleInfo(parseYear(academic_year), k);
        const semData = modData.then(data => {return data.semesterData[sem - 1].timetable;}).catch(err => console.log(err));
        for (const[lessonType, lessonNo] of Object.entries(v)){
            res[k][lessonType] = semData.then(data => {return data.filter(x => x.classNo == lessonNo && x.lessonType.toLowerCase().includes(lessonType.toLowerCase()));})
                .then(x => x.map(async lesson => {await addLessons(parseYear(academic_year),sem, k, lesson); /*console.log(lesson)*/;})).catch(err => console.log(err));
            /* for each lesson in array
                for each week in weeks
                    1. find the date
                    2. add to notion
            */
        }

    }
    return res
}

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

function getDate(year, semester, day, week) {
    //TODO
    var res = new Date(STARTING_DATES[year][semester - 1]);
    res.setTime(res.getTime() + 8 * 60 * 60 * 1000)
    //console.log(res)
    var add = week <= 6 ? (week - 1) * 7 : week * 7;
    switch (day.toLowerCase()) {
        case "monday":
            break;
        case "tuesday":
            add += 1;
            break;
        case "wednesday":
            add += 2;
            break;
        case "thursday":
            add += 3;
            break;
        case "friday":
            add += 4;
            break;
        default:
            break;
    }
    res.addDays(add)
    //console.log(res.toISOString().match(/(.*)T/)[1])
    return res.toISOString().match(/(.*)T/)[1]
}

function parseTime(time) {
    var res = "T";
    res += time.replace(/.{2}/g, '$&:') + "00Z"
    //console.log(res)
    return res
}

function parseYear(year) {
    return year.replaceAll("AY", "")
}

function getLessonType(lessonType) {
    switch (lessonType.toLowerCase()) {
        case "lecture":
            return "Lecture";
        case "recitation":
            return "Recitation";
        case "tutorial":
            return "Tutorial"
        case "laboratory":
            return "Lab";
        case "sectional teaching":
            return "Sectional"
        default:
            console.log(lessonType.toLowerCase());
            return "Others"
    }

}

async function addLessons(year, semester, moduleName, lesson) {
    const weeks = lesson.weeks;
    const lessonTitle = moduleName + " " + lesson.lessonType;
    const lessonType = getLessonType(lesson.lessonType);
    const remarks = lesson.venue;
    weeks.map(async week => {
        const date = getDate(year, semester, lesson.day, week);
        const dateTimeStart = date + parseTime(lesson.startTime);
        const dateTimeEnd = date + parseTime(lesson.endTime);
        if (dateTimeEnd > getCurrentDateString()) 
            await createTask({title: lessonTitle, lessonType: lessonType, remarks: remarks, start: dateTimeStart, end: dateTimeEnd ,module: moduleName});
    })
}

function getCurrentDateString() {
    var currentDate = new Date();
    currentDate.setTime(currentDate.getTime() + 8 * 60 * 60 * 1000);
    return currentDate.toISOString();
}

export default {
    addMyLessons,
  };
