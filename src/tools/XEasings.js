var XEasings = {};

XEasings.linear = function (n) { return n; };
XEasings.easeInQuad = function (n) { return n * n; };
XEasings.easeOutQuad = function (n) { return 1 - (1 - n) * (1 - n); };
XEasings.easeInQuart = function (n) { return n * n * n * n; };
XEasings.easeOutQuart = function (n) { return 1 - pow(1 - n, 4); };
XEasings.easeInOutSine = function (n) { return -(cos(PI * n) - 1) / 2; };
XEasings.easeInOutCubic = function (n) { return n < 0.5 ? 4 * n * n * n : 1 - pow(-2 * n + 2, 3) / 2; };
