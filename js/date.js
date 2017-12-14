/* *** From https://weeknumber.net/how-to/javascript *** */
Date.prototype.getWeek = function() {
	var date = new Date(this.getTime());
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
	var week1 = new Date(date.getFullYear(), 0, 4);
	return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
				- 3 + (week1.getDay() + 6) % 7) / 7);
}

Date.prototype.getWeekYear = function() {
	var date = new Date(this.getTime());
	date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
	return date.getFullYear();
}

/* *** From myself *** */
/* join date part with hour part and return a new date */
Date.prototype.join = function(hour) {
	var date = new Date(this.getTime());

	date.setHours(hour.getHours());
	date.setMinutes(hour.getMinutes());
	date.setSeconds(hour.getSeconds());
	date.setMilliseconds(hour.getMilliseconds());

	return date;
}
