# paramValidator
A node.js tool  using when you need to check params transport into your server's API。

#### Usage

``` javascript
const paramValidator = require('./paramValidator');

/**
 * A controller
 */
function update(req, res) {
  let result = paramValidator(req, {
    query: {
      id: {type:'string', length: '24'}
    },
    body: {
      ip: {special: 'ip'},
      port: {type: 'string', range: [0, 65535]},
      state: {_enum: ['on', 'off']},
      rules: {toObj: true},
      'rules.level': {_enum: ['info','warning','error']},
      'rules.rate': {type: 'number', range:[0,1]},
      'rules.users': {type: 'array'}
    }
  });
  if (result.code) {
    res.json({code: -1, msg: 'validate params failed', extdata: result});
    return;
  }
  // modify your database
}

```

