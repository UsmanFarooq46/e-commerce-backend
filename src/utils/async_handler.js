const errorResp = require("./error_response");

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch((error) => {
            // Ensure the error message is captured correctly
            const errorMessage = error.message || error.toString();
            next(new errorResp(error, errorMessage, 500));
        });
};

module.exports = asyncHandler;
