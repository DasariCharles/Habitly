document.addEventListener("DOMContentLoaded", function () {
    const dateElement = document.getElementById("currentDate");

    const today = new Date();

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    };

    dateElement.textContent = today.toLocaleDateString("en-IN", options);
});