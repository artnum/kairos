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

Date.prototype.hours = function() {
	return this.getHours() + (this.getMinutes() / 60) + (this.getSeconds() / 60 / 60);	
}

Date.prototype.shortDate = function() {
	return this.getDate() + '.' + (this.getMonth() + 1);
}

Date.prototype.fullDate = function() {
	var d = this.getDate(), m = this.getMonth() + 1, y = this.getFullYear();
	if(d < 10) { d = '0' + d; }
	if(m < 10) { m = '0' + m; }

	return d + '.' + m + '.' + y;
}

Date.prototype.shortHour = function() {
	var h = this.getHours(), m = this.getMinutes();
	if(h < 10) { h = '0' + h; }
	if(m < 10) { m = '0' + m; }
	return h + ':' + m;
}

var DateRange = function(begin, end) {
	if(begin instanceof Date) {
		this.begin = begin;
	} else {
		this.begin = new Date(begin);
	}

	if(end instanceof Date) {
		this.end = end;
	} else {
		this.end = new Date(end);
	}
}

DateRange.prototype.within = function(value) {
	if(this.begin.getTime() <= value.getTime() && this.end.getTime() >= value.getTime()) {
		return true;
	}
	return false;
}

DateRange.prototype.overlap = function(daterange) {
	if(daterange instanceof DateRange) {
		if(this.within(daterange.begin) || this.within(daterange.end) ||
			daterange.within(this.begin) || daterange.within(this.end)) {
			return true;
		}
	}

	return false;
}

DateRange.prototype.merge = function (daterange) {
	var begin, end;
	if(this.overlap(daterange)) {
		if(this.begin.getTime() < daterange.begin.getTime()) {
			begin = this.begin;
		} else {
			begin = daterange.begin;
		}

		if(this.end.getTime() > dateragne.end.getTime()) {
			end = this.end;
		} else {
			end = daterange.end;
		}

		return new DateRange(begin, end);
	}

	return NaN;
}
