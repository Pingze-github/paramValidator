/**
 * author: wang719695@gmail.com
 * date: 2017.7.17
 * version: 1.1.0
 * 验证request参数，并对部分参数进行处理
 */

/*
* 更新：
* 1. 取消toObj规则，全部采用隐式转换。
* 2. 取消“.”链式属性，使用对象映射。
* 3. 支持对array相同格式子元素支持。
* 4. 所有规则使用$前缀
* */

// TODO 为内建error增加更多说明信息
// TODO 解决编辑器警告问题
// TODO 递归报错时包含链式的信息

/**
 * 对一个对象遍历检查
 * @param obj
 * @param objSchema
 * @returns {*}
 */
function validateObj (obj, objSchema) {
    for (let paramKey in obj) {
        if (objSchema.hasOwnProperty(paramKey)) {
            let schema =  objSchema[paramKey];
            if (matchType('object', schema) && !matchType('array', schema)) {
                let isRuleMap = Object.keys(schema)[0][0] === '$';
                for (key in schema) {
                    if ((key[0] === '$') !== isRuleMap) {
                        throw new Error('mixed use of rule & prop');
                    }
                }
                if (isRuleMap) {
                    // 是规则映射
                    let ruleMap = schema;
                    for (let ruleName in ruleMap) {
                        let paramValue = obj[paramKey];
                        let ruleValue = ruleMap[ruleName];
                        let validateResult = validate(ruleName, ruleValue, paramKey, paramValue);
                        if (validateResult) {
                            return validateResult;
                        }
                    }
                } else {
                    // 是属性schema
                    let objSchema = schema;
                    let paramValue = obj[paramKey];

                    // FIXME 只在顶级需要判断，次级不会用这种情况
                    if (matchType('object', objSchema) && matchType('string', paramValue)) {
                        try {
                            obj[paramKey] = JSON.parse(paramValue);
                        } catch (e) {
                            return {code: 3, msg: 'parse json to object error', paramKey, paramValue};
                        }
                    }
                    return validateObj(paramValue, objSchema);
                }
            } else {
                // FIXME 这个条件分支包括schema为array的情况
                throw new Error('schema must be an object');
            }
        }
    }
}

/**
 * 参数检查主流程
 * @param schema
 * @param req
 * @returns *
 */
module.exports = function (req, schema) {
    for (let resParamType of ['body','query']) {
        if (req[resParamType]) {
            let objSchema = schema[resParamType];
            let obj = req[resParamType];
            let result = validateObj(obj, objSchema);
            if (result) return result;
        }
    }
    return {code: 0, msg: 'pass'};
/*        if (!schema[objName]) continue;
        let obj = req[objName];
        // let objSchemaList = Object.keys(schema[objName]);
        for (let paramKey in obj) {
            if (schema[objName].hasOwnProperty(paramKey)) {
                let ruleMap = schema[objName][paramKey];
                for (let ruleName in ruleMap) {
                    let paramValue = obj[paramKey];
                    let ruleValue = ruleMap[ruleName];
                    if (matchType('object', ruleValue)) {
                        // 对象类型规则值
                        try {
                            req[objName][paramKey] = JSON.parse(paramValue);
                        } catch (e) {
                            return {code: 3, msg: 'parse json to object error', paramKey, paramValue};
                        }
                        if (matchType('array', ruleValue)) {
                            // 对每个项检查
                        }
                        // 深入遍历对象：

                    } else {
                        // 非对象类型规则值
                        let validateResult = validate(ruleName, ruleValue, paramKey, paramValue);
                        if (validateResult) {
                            return validateResult;
                        }
                    }
                }
            }
        }*/
        //链式参数检查
/*        for (let ruleKey of objSchemaList) {
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
        }*/

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
        case '$equal':
            if (matchEqual(ruleValue, paramValue)) return 0;
            break;
        case '$type':
            if (matchType(ruleValue, paramValue)) return 0;
            break;
        case '$reg':
            if (matchReg(ruleValue, paramValue)) return 0;
            break;
        case '$range':
            if (matchRange(ruleValue, paramValue)) return 0;
            break;
        case '$enum':
            if (matchEnum(ruleValue, paramValue)) return 0;
            break;
        case '$special':
            if (matchSpecial(ruleValue, paramValue)) return 0;
            break;
        case '$length' :
            if (matchLength(ruleValue, paramValue)) return 0;
            break;
        case '$lengthRange' :
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



