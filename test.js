
const paramValidator = require('./paramValidator');

/*
* 1、如何区分规则名和属性？  使用'$'前缀属性
* 2、如何判断值是否需要转为obj？ 如果其对应的schema：1、是array；2、是object且包含不为规则的属性
* 3、逻辑？ 对body遍历，检查其属性是否在schema中，若在，则获取规则判断；若在且为array，则转换；对转换后对象进行逐级深入遍历。
*  若为array，对数据的每一项都要处理。
* 4、 代码复用？ 将对对象的遍历提取出来，导入参数对象和schema对象。这样的问题在于，报错不准确。
*
* */

schema = {
    body: {
        ip : {$special: 'ip'},
        port : {$type: "int", $range: [0, 65535]},
        normalState: {$enum: ["on", "off"]},
        ext: {
            interval1: {$range: [0,20]},
            interval2: {$range: [0,20]},
            a: {
                b: {$enum: ["on","off"]},
                c: [{$enum: ['a1','b1']}]
            }
        },
        rules: [{
                times: {$range: [0,20]},
                a: {
                    b: {$enum: ["on","off"]}
                }
        }],
        ims: [{
            $type: 'number'
        }]
    }
};

let req = {
    body: {
        ip : '123.123.0.255',
        port: 2000,
        normalState: 'on',
        ext: {
            interval1: 10,
            interval2: 10,
            a: {
                b: "on",
                c: ['a1','b1']
            }
        },
        rules: JSON.stringify([
            {
                times: 20,
                a: {
                    b: "on"
                }
            },
            {
                times: 10,
                a: {
                    b: "off"
                }
            }
        ]),
        ims: JSON.stringify([1,2,3,4,'5'])
    }
};

result = paramValidator(req,schema);
console.log(JSON.stringify(result,null,2));
