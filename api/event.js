'use strict';

'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); 

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * @api {POST} /events Add an event
 * @apiName AddEvent
 * @apiGroup Event
 * @apiVersion  0.1.0
 * 
 * 
 * @apiParam {string} name Name of the event
 * @apiParam {string} description Description of the event
 * @apiParam {string} organiser Event organiser
 * @apiParam {int} date Event date
 * 
 * @apiParamExample  {type} Request-Example:
 * {
 * 		"name" : "Roy",
 * 		"eat_at": 886545087,
 * 		"age": 9
 * }
 * 
 * @apiSuccess (200) {string} message message to display
 * @apiSuccess (200) {string} id id of the event
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *		"message": "Sucessfully created new event Call-conf",
 * 		"id": "3d00c1b0-53d5-11e9-93c8-e341f2328a3c"
 * }
 */

module.exports.submit = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const fullname = requestBody.name;
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
        TableName: process.env.EVENTS_TABLE,
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

/**
 * 
 * @api {GET} /events Get all events
 * @apiName GetEvents
 * @apiGroup Event
 * @apiVersion  0.1.0
 * 
 * @apiSuccess (200) {array} event object
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *      "events": [
 *          {
 *              "description": "First test yeah !",
 *              "id": "5257bda0-548b-11e9-998f-5322673bd7b1",
 *              "organiser": "Hugo",
 *              "event_date": 1554129229798,
 *              "fullname": "Test"
 *          }
 *      ]
 * }
 */

module.exports.getAll = (event, context, callback) => {
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

/**
 * 
 * @api {GET} /event/{id} Get event by ID
 * @apiName GetEventById
 * @apiGroup Event
 * @apiVersion  0.1.0
 * 
 * @apiParam {int} id ID of the event

 * 
 * 
 * @apiSuccess (200) {description} event description
 * @apiSuccess (200) {id} event id
 * @apiSuccess (200) {organiser} event organiser
 * @apiSuccess (200) {event_date} event date
 * @apiSuccess (200) {fullname} event name
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *      "description": "First test yeah !",
 *      "id": "5257bda0-548b-11e9-998f-5322673bd7b1",
 *      "organiser": "Hugo",
 *      "event_date": 1554129229798,
 *      "fullname": "Test"
 * }
 */
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


/**
 * 
 * @api {DELETE} /event/{id} Delete event by ID
 * @apiName DeleteEventById
 * @apiGroup Event
 * @apiVersion  0.1.0
 * 
 * @apiParam {int} id ID of the event
 * 
 * 
 * @apiSuccess (200) {message} message to display
 * @apiSuccess (200) {id} event id deleted
 * 
 * @apiSuccessExample {type} Success-Response:
 * {
 *      "message": "Deleted item with id 5257bda0-548b-11e9-998f-5322673bd7b1",
 *      "id": "5257bda0-548b-11e9-998f-5322673bd7b1"
 * }
 */
module.exports.deleteById = (event, context, callback) => {
    const params = {
        TableName: process.env.EVENTS_TABLE,
        Key: {
            id: event.pathParameters.id,
        },
    };
    dynamoDb.delete(params, (err, result) => {
		if (err) {
			callback(new Error('Couldn\'t fetch candidate.'));
		} else {
			const response = {
                statusCode: 200,
                body: JSON.stringify({
                    "message": `Deleted item with id ${event.pathParameters.id}`,
                    "id": event.pathParameters.id
                })
            };
			callback(null, response);
		}
	});
};