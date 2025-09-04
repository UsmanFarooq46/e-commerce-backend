const errorHandler = (err, req, resp, next) => {
  let message = err.custome_message || "Server Error: ";
  let statusCode = err.statusCode || 500;
  
  if (err?.completeError?.name === "CastError") {
    message = `Data not found against provided id ${err?.completeError?.value}`;
    statusCode = 404;
  }

  if (err?.completeError?.name === "ValidationError") {
    if (err.completeError.errors) {
      let validationErrors = Object?.values(err.completeError.errors).map(
        (errMsg) => errMsg.message
      );
      message = "";
      validationErrors?.forEach((element) => {
        message = message + element + "___";
      });
    }
  }

  resp.status(statusCode).json({
    success: false,
    message: message,
  });
};

module.exports = errorHandler;
