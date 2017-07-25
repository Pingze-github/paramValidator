# paramValidator
A easy-use node.js tool to validate params transport into your server's API。

### Intro

**paramValidator** is a easy-use tool to do param validating work in your server.

It uses a **schema** to explain the params structure, and a series of **rules** to define what the param should like.

It supports to transform some params that are transfered into JSON string before sended, automatically and implicitly.

It supports to check into the object type param (within array).

It checks every top-level params to see if then has value as default(use ```$default:xxx``` to close).

It can transfer string type params to needed type using ```$to```.

It has perfect return message and error report, so you can find your mistake easily.

It has easy-read source code, so that you can add your rules easily.

### Usage

``` javascript
const paramValidator = require('./paramValidator');

/**
 * A controller
 */
function update(req, res) {
  let result = paramValidator(req, {
    query: {
      id: {length: '24'},
      ext: {}
    },
    body: {
        ip : {$special: 'ip'},
        port : {$to: "int", $range: [1, 65535], $default: '80'},
        port2 : {$computer: v => {
            if (typeof v === 'undefined') return 80;
            let v = parseInt(v);
            if (v && v>=1 && v<=65535) return v;
        }},
        normalState: {$enum: ["on", "off"], $default: 'on'},
        ext: {
            interval: {$range: [0,20], $to: 'int'},
            $default: null
        },
        rules: [
            {
                times: {$range: [0,20], $to: 'int'},
                a: {
                    b: {$enum: ["on","off"]}
                    c: [{$range: [1,3]}]
                }
            }
        ],
        users: [{reg: /^\d{6,9}$/}],
        users2: {$filter: v => {
            for (let item of v)
                if (!v.match(/^\d{6,9}$/)) return false;
            return true;
        }}
    }
  });
  if (result.code) {
    res.json({code: -1, msg: 'validate params failed', extdata: result});
    return;
  }
  // Then modify your database safely
}

```

### return format

```
// when pass
{
    code: 0,
    msg: 'pass'
}
// when fail
{
    code: 1,
    msg:'not match validate rules',
    ruleName: "$range",
    ruleValue: [0,20],
    paramKey: "req.body.rules[1].times",
    paramValue: 30
}
```

### Note

All rulenames start with a '$'. don't forget that, and don't make your param starts with '$'
(The tool may throw an error).

### Rules

+ $equal
+ $type
+ $reg
+ $range
+ $enum
+ $length
+ $lengthRange
+ $special
+ $to
+ $default
+ $set
+ $filter
+ $computer
