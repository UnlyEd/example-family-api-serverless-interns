'use strict';

'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const fullname = requestBody.fullname;
  const description = requestBody.description;
  const organiser = requestBody.organiser;
  const date = requestBody.date;

  if (typeof fullname !== 'string' || typeof organiser !== 'string' || typeof description !== 'string' || typeof date !== 'number') {
    console.error('Validation Failed');
    callback(new Error('Couldn\'t submit event because of validation errors.'));
    return;
  }

  submitEventP(eventInfo(fullname, description, organiser, date))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted event with name ${fullname}`,
          eventId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit event with name ${fullname}`
        })
      })
    });
};


const submitEventP = event => {
    console.log('Submitting event');
    const eventInfo = {
        Tablefullname: process.env.EVENTS_TABLE,
        Item: event,
    };
    return dynamoDb.put(eventInfo).promise()
    .then(res => event);
};

const eventInfo = (fullname, description, organiser, date) => {
    const timestamp = new Date().getTime();
    return {
        id: uuid.v1(),
        fullname: fullname,
        description: description,
        organiser: organiser,
        event_date: date,
        submittedAt: timestamp,
        updatedAt: timestamp,
    };
};

module.exports.list = (event, context, callback) => {
    var params = {
        TableName: process.env.EVENTS_TABLE,
        ProjectionExpression: "id, fullname, description, organiser, event_date"
    };

    console.log("Scanning events table.");

    dynamoDb.scan(params, (err, data) => {
        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    events: data.Items
                })
            });
        }
    });
};

module.exports.getById = (event, context, callback) => {
    const params = {
        TableName: process.env.EVENTS_TABLE,
        Key: {
            id: event.pathParameters.id,
        },
    };

    dynamoDb.get(params).promise()
        .then(result => {
            const response = {
                statusCode: 200,
                body: JSON.stringify(result.Item),
            };
            callback(null, response);
        })
        .catch(error => {
            console.error(error);
            callback(new Error('Couldn\'t fetch candidate.'));
            return;
    });
};