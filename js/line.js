/* From https://stackoverflow.com/questions/4270485/drawing-lines-on-html-page */
function createLineElement(x, y, length, angle) {
	var line = document.createElement("div");
	var styles = 'border: 1px solid black; '
		+ 'width: ' + length + 'px; '
	 	+ 'height: 0px; '
		+ '-moz-transform: rotate(' + angle + 'rad); '
		+ '-webkit-transform: rotate(' + angle + 'rad); '
		+ '-o-transform: rotate(' + angle + 'rad); '  
		+ '-ms-transform: rotate(' + angle + 'rad); '  
		+ 'position: absolute; '
		+ 'top: ' + y + 'px; '
		+ 'left: ' + x + 'px; ';
	line.setAttribute('style', styles);  
	return line;
}
