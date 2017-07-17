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
            let result = validateObj(obj, objSchema, `req.${resParamType}`);
            if (result) return result;
        }
    }
    return {code: 0, msg: 'pass'};
};

/**
 * 对一个对象遍历检查
 * @param obj
 * @param objSchema
 * @param objPath
 * @returns {*}
 */
function validateObj (obj, objSchema, objPath) {
    if (!matchType('object', objSchema)) {
        throw TypeError('Schema found not an object');
    }
    for (let paramKey in obj) {
        if (obj.hasOwnProperty(paramKey) && objSchema.hasOwnProperty(paramKey)) {
            let schema =  objSchema[paramKey];
            if (matchType('object', schema)) {
                let isRuleMap;
                if (matchType('array', schema)) {
                    isRuleMap = false;
                } else {
                    isRuleMap = Object.keys(schema)[0][0] === '$';
                    for (let key in schema) {
                        if (schema.hasOwnProperty(key)) {
                            if ((key[0] === '$') !== isRuleMap) {
                                throw new Error('mixed use of rule & prop');
                            }
                        }
                    }
                }
                if (isRuleMap) {
                    let ruleMap = schema;
                    for (let ruleName in ruleMap) {
                        if (ruleMap.hasOwnProperty(ruleName)) {
                            let paramValue = obj[paramKey];
                            let ruleValue = ruleMap[ruleName];
                            let validateResult = validate(ruleName, ruleValue, `${objPath}.${paramKey}`, paramValue);
                            if (validateResult) return validateResult;
                        }
                    }
                } else {
                    let objSchema = schema;
                    let paramValue = obj[paramKey];
                    if (matchType('array', objSchema)) {
                        let index = 0;
                        for (let paramValueEach of paramValue) {
                            index++;
                            if (objSchema.length !== 1) {
                                throw new Error(`Array schema of ${objPath}.${paramKey} cannot have one more value`);
                            }
                            let validateResult = validateObj(paramValueEach, objSchema[0], `${objPath}.${paramKey}[${index}]`);
                            if (validateResult) return validateResult;
                        }
                    } else {
                        // FIXME 只在顶级需要判断，次级不会用这种情况
                        if (matchType('object', objSchema) && matchType('string', paramValue)) {
                            try {
                                obj[paramKey] = JSON.parse(paramValue);
                            } catch (e) {
                                return {code: 3, msg: 'parse json to object error', paramKey, paramValue};
                            }
                        }
                        let validateResult = validateObj(paramValue, objSchema, `${objPath}.${paramKey}`);
                        if (validateResult) return validateResult;
                    }
                }
            } else {
                throw TypeError(`Schema of ${objPath}.${paramKey} found not an object`);
            }
        }
    }
}

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
            throw SyntaxError(`Meet invalid rule name ${ruleName} when checking ${paramKey}`);
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



