const protected_route = (req, res, next) => {
  try {
    const token = req.cookies.
  } catch (error) {
    console.log(
      "There was a problem with the route protection middleware: \n",
      error
    );
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export default protected_route;
