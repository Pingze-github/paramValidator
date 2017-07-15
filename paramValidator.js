/**
 * author: wang719695@gmail.com
 * date: 2017.7.14
 * version: 1.0.0
 * 验证request参数，并对部分参数进行处理
 */

/**
 * 参数检查函数
 * @param schema
 * @param req
 * @returns *
 */
module.exports = function (req, schema) {
    for (let objName of ['body','query']) {
        if (!schema[objName]) continue;
        let obj = req[objName];
        let objSchemaList = Object.keys(schema[objName]);
        // 普通参数检查
        for (let paramKey in obj) {
            if (objSchemaList.includes(paramKey)) {
                let ruleMap = schema[objName][paramKey];
                for (let ruleName in ruleMap) {
                    let paramValue = obj[paramKey];
                    let ruleValue = ruleMap[ruleName];
                    // json字符串转object
                    if (ruleName === 'toObj') {
                        try {
                            req[objName][paramKey] = JSON.parse(paramValue);
                        } catch (e) {
                            return {code: 3, msg: 'parse json to object error', paramKey, paramValue};
                        }
                    // TODO 支持检查array的内部项
/*                    } else if (ruleName === 'arrayItem') {
                        if (matchType('array', paramValue)) {
                            for (let itemValue of paramValue) {
                                let itemRuleName =
                            }
                        }*/
                    } else {
                        let validateResult = validate(ruleName, ruleValue, paramKey, paramValue);
                        if (validateResult) {
                            return validateResult;
                        }
                    }
                }
            }
        }
        //链式参数检查
        for (let ruleKey of objSchemaList) {
            if (ruleKey.includes('.')){
                let keylist = ruleKey.split('.');
                // 尝试隐式转为obj
                let paramKey = keylist[0];
                if (req[objName][paramKey]) {
                    let paramValue = req[objName][paramKey];
                    if (typeof paramValue !== 'object') {
                        try {
                            req[objName][paramKey] = JSON.parse(paramValue);
                        } catch (e) {
                            return {code: 3, msg:'parse json to object error', paramKey, paramValue};
                        }
                    }
                    // 利用keylist获取paramValue对象中的值
                    let value = paramValue;
                    keylist.splice(0,1);
                    for (key of keylist) {
                        value = value[key];
                        if (typeof value === 'undefined') {
                            return {code: 4, msg: 'not found listkey', ruleKey};
                        }
                    }
                    // 对最终获取的value进行检查
                    let ruleMap = schema[objName][ruleKey];
                    for (let ruleName in ruleMap) {
                        let ruleValue = ruleMap[ruleName];
                        let validateResult = validate(ruleName, ruleValue, ruleKey, value);
                        if (validateResult) {
                            return validateResult;
                        }
                    }
                } else {
                    return {code: 5, msg: 'not found listkey\'s fisrt key' , ruleKey};
                }

            }
        }
    }
    return {code: 0, msg: 'pass'};
};

/**
 * 检测规则和值是否匹配
 * @param ruleName
 * @param ruleValue
 * @param paramValue
 * @param paramKey
 * @returns {*}
 */
function validate(ruleName, ruleValue, paramKey, paramValue) {
    if (matchType('undefined', paramValue)){
        if (ruleName === 'type' && ruleValue === 'undefined') {
            return 0;
        } else {
            return {code: 2, result:'undefined', ruleName, ruleValue, paramKey, paramValue};
        }
    }
    switch (ruleName) {
        case 'equal':
            if (matchEqual(ruleValue, paramValue)) return 0;
            break;
        case 'type':
            if (matchType(ruleValue, paramValue)) return 0;
            break;
        case 'reg':
            if (matchReg(ruleValue, paramValue)) return 0;
            break;
        case 'range':
            if (matchRange(ruleValue, paramValue)) return 0;
            break;
        case '_enum':
            if (matchEnum(ruleValue, paramValue)) return 0;
            break;
        case 'special':
            if (matchSpecial(ruleValue, paramValue)) return 0;
            break;
        case 'length' :
            if (matchLength(ruleValue, paramValue)) return 0;
            break;
        case 'lengthRange' :
            if (matchLengthRange(ruleValue, paramValue)) return 0;
            break;
        default:
            throw new Error(`Meet invalid rule name [${ruleName}] when checking ${paramKey}`);
    }
    return {code: 1, msg:'not match validate rules', ruleName, ruleValue, paramKey, paramValue};
}


/**
 * 匹配值相等（完全相等）
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchEqual(ruleValue, paramValue) {
    if (ruleValue === paramValue) {
        return true;
    }
    return false;
}

/**
 * 匹配正则（字符串）
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchReg(ruleValue, paramValue) {
    if (matchType('string', paramValue)) {
        if (paramValue.match(ruleValue)) {
            return true;
        }
    }
    return false;
}

/**
 * 匹配值类型
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchType(ruleValue, paramValue) {
    if (ruleValue === 'int') {
        if (typeof paramValue === 'number' && parseInt(paramValue) === paramValue) {
            return true;
        }
    }
    if (ruleValue === 'array'){
        if (Object.prototype.toString.call(paramValue) === '[object Array]') {
            return true;
        }
    }
    return (typeof paramValue === ruleValue);
}

/**
 * 匹配特殊规则
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchSpecial(ruleValue, paramValue) {
    if (ruleValue === 'ip') {
        if (matchReg(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, paramValue)){
            let patterns = paramValue.split('.');
            for (let patt in patterns) {
                if (parseInt(patt) < 0 && parseInt(patt) > 255) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}

/**
 * 匹配范围（数字）
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchRange(ruleValue, paramValue) {
    if (matchType('string', paramValue)) {
        paramValue = parseFloat(paramValue) ? parseFloat(paramValue) : paramValue;
    }
    if (matchType('number', paramValue)) {
        if (typeof ruleValue[0] === 'undefined' && typeof ruleValue[1] !== 'undefined') {
            if (ruleValue[1] >= paramValue) {
                return true;
            }
        } else if (typeof ruleValue[1] === 'undefined' && typeof ruleValue[0] !== 'undefined') {
            if (ruleValue[0] <= paramValue) {
                return true;
            }
        } else {
            if (ruleValue[0] <= paramValue && ruleValue[1] >= paramValue) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 匹配枚举
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchEnum(ruleValue, paramValue) {
    return (ruleValue.includes(paramValue));
}

/**
 * 匹配长度（字符串或array）
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchLength(ruleValue, paramValue) {
    if (matchType('string', paramValue) || matchType('array', paramValue)) {
        if (paramValue.length === ruleValue) {
            return true;
        }
    }
    return false;
}

/**
 * 匹配长度范围（字符串或array）
 * @param ruleValue
 * @param paramValue
 * @returns boolean
 */
function matchLengthRange(ruleValue, paramValue) {
    if (matchType('string', paramValue) || matchType('array', paramValue)) {
        if (typeof ruleValue[0] === 'undefined' && typeof ruleValue[1] !== 'undefined') {
            if (ruleValue[1] >= paramValue) {
                return true;
            }
        } else if (typeof ruleValue[1] === 'undefined' && typeof ruleValue[0] !== 'undefined') {
            if (ruleValue[0] <= paramValue) {
                return true;
            }
        } else {
            if (ruleValue[0] <= paramValue && ruleValue[1] >= paramValue) {
                return true;
            }
        }
    }
    return false;
}


// FOR TEST
if (!module.parent) {
    schema = {
        body: {
            ip : {special: 'ip'},
            port : {type: "int", range: [0, 65535]},
            normalState: {_enum: ["on", "off"]},
            rules: {type: 'object'},
            rules2: {toObj: true},
            "rules.times": {range: [0,]},
            "rules.a.b": {_enum: ["on","off"]}
        }
    };
    let req = {
        body: {
            ip : '123.123.0.255',
            port: 2000,
            normalState: 'on',
            rules: {
                times: 0,
                a: {
                    b: "on"
                }
            },
            rules2: JSON.stringify({level:"error"})
        }
    };

    result = module.exports(req,schema);
    console.log(JSON.stringify(result,null,2));
}
