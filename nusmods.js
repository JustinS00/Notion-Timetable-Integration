const {createTask} = require("./notion")

const YEAR = "2022-2023";
const STARTING_DATES = ["08-08-2022","01-09-2023","05-08-2023","06-19-2023"]

function getSemester(context) {
    const sem = context.match(/sem-(.*)\/share?/)[1];
    return sem;
}
function getModules(context) {
    const mods = context.match(/share?(.*)/)[1].slice(1);
    return mods;
}

function getModuleInfo(year, module_code) {
    const path = [process.env.NUS_MODS_API] + year + "/modules/" + module_code + ".json";
    var query = fetch(path).then((response) => response.json()).then((data) => {console.log(module_code + " is successfully retrived"); return data});
    return query;
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

function addMyLessons(link) {
    const sem = getSemester(link);
    const modList = getMyModules(link);;
    const res = {};
    for (const[k,v] of Object.entries(modList)) {
        res[k] = {};
        const modData = getModuleInfo(YEAR, k);
        const semData = modData.then(data => {return data.semesterData[sem - 1].timetable;});
        for (const[lessonType, lessonNo] of Object.entries(v)){
            res[k][lessonType] = semData.then(data => {return data.filter(x => x.classNo == lessonNo && x.lessonType.toLowerCase().includes(lessonType.toLowerCase()));})
                .then(x => x.map(async lesson => {await addLessons(sem, k, lesson); /*console.log(lesson)*/;}));
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

function getDate(semester, day, week) {
    var res = new Date(STARTING_DATES[semester - 1]);
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

async function addLessons(semester, moduleName, lesson) {
    const weeks = lesson.weeks;
    const lessonTitle = moduleName + " " + lesson.lessonType;
    const lessonType = getLessonType(lesson.lessonType);
    const remarks = lesson.venue;
    weeks.map(async week => {
        const date = getDate(semester, lesson.day, week);
        const dateTimeStart = date + parseTime(lesson.startTime);
        const dateTimeEnd = date + parseTime(lesson.endTime);
        //console.log(dateTimeStart)
        //console.log(dateTimeEnd)
        if (dateTimeEnd > getCurrentDateString()) 
            await createTask({title: lessonTitle, lessonType: lessonType, remarks: remarks, start: dateTimeStart, end: dateTimeEnd ,module: moduleName});
    })
}

function getCurrentDateString() {
    var currentDate = new Date();
    currentDate.setTime(currentDate.getTime() + 8 * 60 * 60 * 1000);
    return currentDate.toISOString();
}




//addMyLessons("https://nusmods.com/timetable/sem-2/share?CS2105=LEC:1,TUT:04&CS2106=LAB:11,TUT:13,LEC:2&CS2107=LEC:1,TUT:01&GESS1025=TUT:D34&LSM1301=LEC:1,LAB:3")

module.exports = {
    addMyLessons
}
