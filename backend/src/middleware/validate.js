const { AppError } = require('../utils/errors');

// validate(schema)            -> parses req.body and replaces it with the clean result
// validate(schema, 'query')   -> parses req.query and exposes the result as req.validQuery
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

const validateObjectId = (param = 'id') => (req, res, next) =>
  OBJECT_ID.test(req.params[param] || '') ? next() : next(new AppError(400, `Invalid ${param}`));

module.exports = { validate, validateObjectId, OBJECT_ID };
