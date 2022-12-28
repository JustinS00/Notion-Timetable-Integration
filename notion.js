const {Client} = require("@notionhq/client")

const notion = new Client({auth: process.env.NOTION_API_KEY})

async function getDatabase() {
    const response = await notion.databases.retrieve({database_id: process.env.NOTION_DATABASE_ID})
    console.log(response);
    return response;
}

async function getDatabaseItemsBy(property, reverse = false) {
    const response = await notion.databases.query({database_id: process.env.NOTION_DATABASE_ID, sorts: [{
        property: property,
        direction: reverse ? "descending" : "ascending"
    },]
    })
    //console.log(response);
    return response; 
}

async function removeDuplicates() {
    const items = await getDatabaseItemsBy("Date").then(res => {return res.results.map(x => {return {id: x.id, properties: x.properties}})});
    if (items.length < 2) {
        return;
    }
    i = 0;
    j = 1;
    while (j < items.length) {
        current = items[i];
        next = items[j];
        await hasSameProperities(current, next).then(res => {if (res) {notion.blocks.delete({block_id: next.id});}})
        i += 1;
        j += 1;
    }
}

async function hasSameProperities(first_item, second_item) {
    for (const[k,v] of Object.entries(first_item.properties)) {
        try {
            const first = await notion.pages.properties.retrieve({ page_id: first_item.id, property_id: v.id });
            const second = await notion.pages.properties.retrieve({ page_id: second_item.id, property_id: v.id });
            if (JSON.stringify(first) != JSON.stringify(second)) {
                return false;
            }
        } catch {
            console.log("page has been deleted")
            return false;
        }
    }
    return true;
}

function isEqual(first, second) {
    return JSON.stringify(first) == JSON.stringify(second)
}


async function getTags() {
    const database = await notion.databases.retrieve({database_id: process.env.NOTION_DATABASE_ID})
    return database.properties.Module.select.options.map(option => {return {id: option.id, name: option.name}})

}

function notionProperitiesByID(properities) {
    return Object.values(properities).reduce((obj,property) => {
        const {id, ...rest} = property
        return {...obj, [id]:rest}
    }, {})
}

function createTask({title,lessonType,remarks,start, end, module}){
    console.log(start,end);
    notion.pages.create({
        parent: {
            database_id: process.env.NOTION_DATABASE_ID
        },
        properties: {
            "Module": {
                type: "select",
                select: {
                    name: module,
                }
            },
            "Type": {
                type: "select",
                select: {
                    name: lessonType,
                }
            },
            "Task": {
                title:[
                    {
                        type: "text",
                        text: {
                            content: title
                        }
                    }
                ]
            },
            "Date": {
                type:"date",
                date: {
                    start: start,
                    end: end,
                    time_zone: "Singapore"
                    }
            },

            "Remarks": {
                rich_text:[
                    {
                        type: "text",
                        text: {
                            content: remarks
                        }
                    }
                ]
            }

        }
    })
}


module.exports = {
    createTask
}
