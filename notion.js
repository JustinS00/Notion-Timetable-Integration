const {Client} = require("@notionhq/client")

const notion = new Client({auth: process.env.NOTION_API_KEY})

var properties = [];

async function getDatabase() {
    const response = await notion.databases.retrieve({database_id: process.env.NOTION_DATABASE_ID})
    return response;
}

async function getProperties() {
    //const database = await getDatabase();
    return await getDatabase().then(res => {return res.properties;});
}

async function getPropertiesID() {
    const properties = await getProperties();
    //console.log(properties)
    return Object.values(properties).map(property => {return property.id});
}

async function getSortedDatabase() {

}

async function makeSortingConditions() {
    var conditions = []
    await getPropertiesID().then(res => {res.forEach(property => conditions.push({property: property, direction: "ascending"}))})   
    return conditions;
}

async function getDatabaseItemsBy(property, reverse = false) {
    let hasMoreItems = true;
    
    const response = await notion.databases.query({database_id: process.env.NOTION_DATABASE_ID, sorts: [{
        property: property,
        direction: reverse ? "descending" : "ascending"
    }]
    })
    //console.log(response);
    return response; 
}

async function getDatabaseItems() {
    let hasMoreItems = true;
    var res = [];
    var cursor;
    while (hasMoreItems) {
        var q = await notion.databases.query({database_id: process.env.NOTION_DATABASE_ID, sorts: await makeSortingConditions(), start_cursor: cursor})
        Array.prototype.push.apply(res, q.results);
        //console.log(res);
        hasMoreItems = q.has_more;
        if (hasMoreItems) {
            var cursor = q.next_cursor;
        }
    }
    //console.log(res.map(x => {return {id:x.id, url:x.url}}));
    return res.map(x => {return x.id});
    
}

async function deleteAll() {
    const items = await getDatabaseItems();
    for (let i = 0; i < items.length; i++) {
        notion.blocks.delete({block_id:items[i]})
    }
}

async function removeDuplicates() {
    
    //const items = await getDatabaseItemsBy("Date").then(res => {return res.results.map(x => {return {id: x.id, properties: x.properties}})});
    const items = await getDatabaseItems();

    /*
    const property = await properties.then(res =>{return res[0]});   
    for (const element of items) {
        await notion.pages.properties.retrieve({page_id:element, property_id:property}).then(res => console.log(res))
    }
    return
    */
    var i = 0;
    var j = 1;

    while (j < items.length) {
        var current = items[i];
        var next = items[j];
        console.log(current);
        var isSame = await hasSameProperities(current, next)
        if (isSame) {
            notion.blocks.delete({block_id: next})
        } else {
            i = j;
        }
        j += 1;
    }
}

async function hasSameProperities(first_item, second_item) {
    const props = await properties;
    for (const property of props) {
        try {
            const first = await notion.pages.properties.retrieve({ page_id: first_item, property_id: property });
            const second = await notion.pages.properties.retrieve({ page_id: second_item, property_id: property });
            if (!isEqual(first, second)) {
                return false;
            }
        } catch {
            console.log("error")
            return false;
        }
    }
    return true;
    
    //TODO: remove first_item.properities, second_item properities
    // first_item and second_item is now just page ID, get the properties id from await getPropertiesID()
    for (const[k,v] of Object.entries(first_item.properties)) {
        try {
            const first = await notion.pages.properties.retrieve({ page_id: first_item.id, property_id: v.id });
            const second = await notion.pages.properties.retrieve({ page_id: second_item.id, property_id: v.id });
            if (!isEqual(first, second)) {
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
async function setProperties() {
    properties = getPropertiesID();
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

async function createTask({title,lessonType,remarks,start, end, module}){
    console.log(title,lessonType,remarks,start, end, module);
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
    createTask,
    deleteAll
}
