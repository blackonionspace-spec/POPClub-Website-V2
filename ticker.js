
(function (global, factory) {
  if (typeof exports === "object" && typeof module === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof exports === "object") {
    exports.ticker = factory();
  } else {
    global.ticker = factory();
  }
})(self, function () {
  $(document).ready(function () {
    $("[lumious-ticker]").each(function () {
      var ticker = $(this);

      var isVertical = ticker.css("flex-direction").startsWith("column");
      var isReversed = ticker.css("justify-content") === "flex-end";
      var pauseOnHover = ticker.attr("lumious-ticker-pause") !== "false";

      function getSpeed() {
        var width = $(window).width();

        if (width <= 478) {
          return (
            parseFloat(ticker.attr("lumious-ticker-speed-mobile")) ||
            parseFloat(ticker.attr("lumious-ticker-speed")) ||
            1
          );
        }

        if (width <= 991) {
          return (
            parseFloat(ticker.attr("lumious-ticker-speed-tablet")) ||
            parseFloat(ticker.attr("lumious-ticker-speed")) ||
            1
          );
        }

        return parseFloat(ticker.attr("lumious-ticker-speed")) || 1;
      }

      var speed = getSpeed();
      var currentSpeed = speed;
      var position = 0;

      var content = ticker.find("[lumious-ticker-content]");

      if (content.length < 2) {
        content.first().clone().appendTo(ticker);
        content = ticker.find("[lumious-ticker-content]");
      }

      requestAnimationFrame(function animate() {
        var movement =
          (currentSpeed / (isVertical ? ticker.height() : ticker.width())) *
          100 *
          (1 / 60);

        position += isReversed ? movement : -movement;

        content.each(function () {
          $(this).css(
            "transform",
            (isVertical ? "translateY" : "translateX") +
              "(" + position + "%)"
          );
        });

        if (
          (!isReversed && position <= -100) ||
          (isReversed && position >= 100)
        ) {
          position = 0;
        }

        requestAnimationFrame(animate);
      });

      if (pauseOnHover) {
        ticker.hover(
          function () {
            currentSpeed = 0;
          },
          function () {
            currentSpeed = speed;
          }
        );
      }

      $(window).resize(function () {
        speed = getSpeed();
        currentSpeed = speed;
      });
    });
  });

  return {};
});
