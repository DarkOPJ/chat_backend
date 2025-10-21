const protected_route = (req, res, next) => {
    try {
        
    } catch (error) {
        console.log("There was a problem with the route protection middleware: \n", error)
        return res.status(500).json()
    }
}

export default protected_route