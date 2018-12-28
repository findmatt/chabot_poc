var moment = require('moment') // moment js library for date manipulation

//Global var
// ABAP system RFC connection parameters
var credentials = {
    user: 'A_venkata',
    passwd: '2@abcdef',
    ashost: '130.12.12.57',
    sysnr: '00',
    client: '800',
    lang: 'EN',
};


/**
 * RFC call to Leave FM
 * @param   {string} name - userID
 * @param   {string} action - INS, MOD, DEL, OVERVIEW
 * @param   {string} begda - begda of new request
 * @param   {string} endda - endda of new request
 * @param   {string} oldEndda - endda of request to be modified
 * @param   {string} oldBegda - begda of request to be modified
 */
async function SAP_RFC_LEAVE(state, event, { name, action, begda, endda, oldBegda, oldEndda }) {
    if (action == 'OVERVIEW' || action == 'CHECK') {
        begda = moment(new Date()).toISOString()
        endda = begda
    }
    if (action != 'MOD') {
        oldBegda == '00000000'
        oldEndda == '00000000'
    }
    try {
        
    begda = await formatDate(begda)
    endda = await formatDate(endda)
    oldBegda = await formatDate(oldBegda)
    oldEndda = await formatDate(oldEndda)
    } catch (error) {
        
    }
    const importStruct =
    {
        USERID: name,
        BEGDA: begda,
        ENDDA: endda,
        ACTION: action,
        REMARKS: 'NA',
    }
    var res = null
    var error = null
    const rfcClient = require('node-rfc').Client;
    console.log('check rfc node module'+JSON.stringify(rfcClient));
    const client =  await new rfcClient(credentials);

    console.log('checking rfcClient:'+JSON.stringify(client));
    
    console.log(client.version);
    try {
        await client.open()
        res = await client.call('ZTL_LEAVE_APP', { IMPORTSTRUCT: importStruct })
    } catch (error) {
        console.warn(error)
    }
    console.log(res)
    return { ...state, res: res }
}

/**
 * function to initialise or reset begda endda to null
 */
async function initDates(state, event, params) {
    const dates = {}
    const newBegda = null
    const newEndda = null
    await event.bp.users.untag(event.user.id, 'begda')
    await event.bp.users.untag(event.user.id, 'endda')
    await event.bp.users.tag(event.user.id, 'begda', newBegda)
    await event.bp.users.tag(event.user.id, 'endda', newEndda)
    return { ...state, dates: dates }
}
/**
 * general purpose function to get entity 
 */
async function getDateEntities(state, event, params) {
    var dates = {}
    var unknown = []
    var duration = null
    var from = null
    var to = null
    try {
        const entities = event.nlu.entities
        for (i = 0; i < event.nlu.entities.length; i++) {
            //dates entity
            if (entities[i].type == 'time') {
                if (entities[i].additional_info.type == 'interval') {
                    if (entities[i].additional_info.from != undefined) {
                        from = entities[i].additional_info.from.value
                    } else {
                        from = null
                    }
                    if (entities[i].additional_info.to != undefined) {
                        to = entities[i].additional_info.to.value
                    } else {
                        to = null
                    }
                } else {
                    unknown.push(entities[i].value)
                }
            }
            //duration entity
            if (entities[i].type == 'duration') {
                duration = entities[i].additional_info.normalized.value//duration in seconds
            }
        }

    } catch (error) {
    }
    dates = { from: from, to: to, unknown: unknown, duration: duration }
    return { ...state, dates: dates }
}

/**
 * function to convert retrieved entities into begda or endda
 */
async function convertDateEntities(state, event, params) {
    const oldBegda = await event.bp.users.getTag(event.user.id, 'begda')
    var newBegda = oldBegda
    var newEndda = null
    //interval detected in date entities
    if (state.dates.from != null) {
        newBegda = state.dates.from
        newEndda = moment(state.dates.to).subtract(1, 'days').toISOString()
    }
    //single date detected proceed to determine endda or begda
    if (state.dates.unknown.length != 0) {
        // derive high low dates if more than one unknown date retrieved
        var dateLow = moment(state.dates.unknown[0])
        if (state.dates.unknown.length > 1) {
            var dateHigh = moment(state.dates.unknown[1])
            if (dateHigh.isBefore(dateLow)) {
                let tempDate = dateLow
                dateLow = dateHigh
                dateHigh = tempDate
            }
        }
        //determine unknown date is begda or endda
        if (newBegda == null) {
            newBegda = dateLow.toISOString()
            if (state.dates.unknown.length > 1)
                newEndda = dateHigh.toISOString()
        } else {
            newEndda = dateLow.toISOString()
        }
    }
    //duration detected (for deriving endda)
    if (state.dates.duration != null && newBegda != null && newEndda == null) {
        newEndda = moment(newBegda).add(state.dates.duration, 'seconds').toISOString()
    }
    try {
        newBegda = newBegda.substr(0, 10)
        newEndda = newEndda.substr(0, 10)
    } catch (error) {

    }
    await event.bp.users.tag(event.user.id, 'begda', newBegda)
    await event.bp.users.tag(event.user.id, 'endda', newEndda)
    const test = event.bp.users.getTags()

    return
}
/**
 * get collected begda endda info to state.begda and state.endda, oldBegda oldEndda to state.oldBegda state.oldEndda
 */
async function getDateTags(state, event, params) {
    var begda = await event.bp.users.getTag(event.user.id, 'begda')
    var endda = await event.bp.users.getTag(event.user.id, 'endda')
    var oldBegda = await event.bp.users.getTag(event.user.id, 'oldBegda')
    var oldEndda = await event.bp.users.getTag(event.user.id, 'oldEegda')
    const newState = { ...state }
    delete newState.begda
    delete newState.endda
    try {
        begda = begda.substr(0, 10)
        endda = endda.substr(0, 10)
        oldBegda = oldBegda.substr(0, 10)
        oldEndda = oldEndda.substr(0, 10)
    } catch (error) {

    }
    return { ...newState, begda: begda, endda: endda, oldBegda: oldBegda, oldEndda: oldEndda }
}

async function formatDate(date) {
    date = date.substr(0, 10)
    date = date.split("-").join("")
    return date
}
/**
 * Display carousel of leave requests
 */
async function displayLeaveRequests(state, event, params) {
    echostruct = {
        begda: 12.
    }
    var choices = []

    // const leaveTable = state.echoStruct.LEAVE_TABLE
    //testing replace with hardcode
    const leaveTable = [
        {
            BEGDA: '12.12.2018',
            ENDDA: '14.12.2018'
        },
        {
            BEGDA: '01.01.2019',
            ENDDA: '30.01.2019'
        }
    ]
    //end of hardcode testing
    choice = { payload: '', title: '' }
    for (i = 0; i < leaveTable.length; i++) {
        let choice = { payload: `From ${leaveTable[i].BEGDA} \nTo ${leaveTable[i].ENDDA}`, title: `From ${leaveTable[i].BEGDA} \nTo ${leaveTable[i].ENDDA}` }
        choices.push(choice)
    }
    await event.reply('#dynamic-choice', { choices })
}
/**
 * Verify chosen request
 * @param begda - start date of leave request
 * @param endda - end date of leave request
 * @param echostruct - echostruct
 */
async function verifyLeaveRequests(state, event, params) {
    //testing replace with hardcode
    const LEAVETABLE = [
        {
            BEGDA: '20181212',
            ENDDA: '20181214'
        },
        {
            BEGDA: '20190101',
            ENDDA: '20190130'
        }
    ]
    params.echostruct = { LEAVETABLE: LEAVETABLE }
    const chosenBegda = moment(params.begda)
    const chosenEndda = moment(params.endda)
    //end of hardcode testing
    for (i = 0; i < params.echostruct.LEAVETABLE.length; i++) {
        let realBegda = moment(params.echostruct.LEAVETABLE[i].BEGDA)
        let realEndda = moment(params.echostruct.LEAVETABLE[i].ENDDA)
        if (chosenBegda.isSame(realBegda) && chosenEndda.isSame(realEndda)) {
            return { ...state, verification: true }
        }
    }
    return { ...state, verification: false }
}
async function test(state, event) {
    console.log(state)
    console.log(event)
}
module.exports = { getDateEntities, convertDateEntities, initDates, getDateTags, SAP_RFC_LEAVE, displayLeaveRequests, verifyLeaveRequests, test }
