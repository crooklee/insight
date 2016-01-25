var MAX_L = 512
var MAX_P_NUM = 12
var MAX_M_NUM = 11

function isId(id){
    if(!id)return false
    return id
}

function isName(name){
    if(!name || name.length>MAX_L)return false
    return name
}

function isPerson(person){
    if(!person || person.length>MAX_L)return false
    return person
}

function isMobile(mobile){
    if(!mobile || mobile.length>MAX_M_NUM)return false
    return mobile
}

function isPhone(phone){
    if(!phone || phone.length>MAX_P_NUM)return false
    return phone
}

function isEmail(email){
    if(!email || email.length>MAX_L)return false
    return email
}

function isEventType(type){
    if(!type)return false
    return type
}

function isFloat(data){
    f = parseFloat(data)
    if(f)return data
    else return false
}