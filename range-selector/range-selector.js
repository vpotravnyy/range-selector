$(function(){
	$.fn.rangeSelector = function(options){
		// private fields
		var $doc = $(document)
		var keyboardInputBuffer = ""
		var keyboardInputTimeout = null
		var isFocused = false

		var RangeSelector = function(el){
			this.$input = $(el)
			this.$control = null
			this.$handle = null
			this.$tooltipVal = null
			this.min  = parseFloat(this.$input.attr("min")  || 0)
			this.max  = parseFloat(this.$input.attr("max")  || 100)
			this.step = parseFloat(this.$input.attr("step") || 1)
			this.val = parseFloat(this.$input.attr("value") || this.min)
			this.width = 0
			this.offset = 0
			this.digitsAfterDot = Math.min(3, (this.step%1).toString().replace(".","").length - 1)

			this.proxy(["mouseDown","mouseUp","mouseMove","focus","blur","keyDown"])
			    .createHtml()
			    .setupHandlers()
			    .setValue({val: this.val})
		}

		RangeSelector.prototype = {
			proxy: function(fnNames) {
				fnNames.forEach(function(fnName){
					this[fnName] = this[fnName].bind(this)
				}, this)
				return this
			},

			createHtml: function(){
				this.$input
				    .attr("type", "hidden")
				    .wrap('<div class="control-range noTrs" data-max="' + this.max + '" data-min="' + this.min + '"></div>')
				    .before('<div class="handle" tabindex="0">\
				             	<div class="tooltip">\
				    	    		<span class="tooltip-val">' + this.$input.val() + '</span>\
				    	    		<div class="arrow"></div>\
				    	    	</div>\
				    	    </div>')

				this.$control = this.$input.closest('.control-range')
				this.$handle = this.$control.find('.handle')
				this.$tooltipVal = this.$control.find('.tooltip-val')

				this.$control.addClass(this.$input[0].className)
				this.width = this.$control.width()

				setTimeout(function(){
					this.$control.removeClass("noTrs")
				}.bind(this),0)

				return this
			},

			setupHandlers: function () {
				this.$control
				    .on("mousedown", this.mouseDown)
				this.$handle
				    .on("focus", this.focus)

				return this
			},

			setValue: function (param) {
				if (typeof param == 'undefined') param = {val: this.val}
				if (typeof param == 'number') param = {val: param}

				var val        = !isNaN(param.val)      ? param.val      : Math.round(param.valFloat*(this.max-this.min)/this.step)*this.step + this.min
				var valFloat   = !isNaN(param.valFloat) ? param.valFloat : (param.val-this.min) / (this.max-this.min)
				
				var valPercent = valFloat*100 + '%'
				var valPx      = valFloat*this.width + 'px'

				this.val = val
				this.$input
				    .val(val)
				this.$handle
				    .attr("data-val", parseFloat(val).toFixed( this.digitsAfterDot ))
				    .css("left", valPercent)
				this.$tooltipVal
				    .text(parseFloat(val).toFixed( this.digitsAfterDot ))
				this.$control
				    .css("background-position", valPx+' 0, 0 0')

				return {val:val, valFloat:valFloat}
			},

			mouseDown: function(e){
				this.$control.addClass("drag")
				this.offset = this.$control.offset().left
				$doc.on("mouseup", this.mouseUp)
				$doc.on("mousemove", this.mouseMove)
				this.$input.trigger("sliderDown", e)
				this.mouseMove(e)

				return this
			},

			mouseUp: function(e){
				this.$control.removeClass("drag")
				$doc.off("mousemove", this.mouseMove)
				$doc.off("mouseup", this.mouseUp)
				this.$handle.focus()

				setTimeout(function(){              // This will animate slider to it's stepped position
					var values = this.setValue()    // immediately after mouseUp
					this.$input.trigger("sliderUp", values)
				}.bind(this), 0)

				return this
			},

			mouseMove: function(e){
				var valFloat = (e.pageX - this.offset) / this.width
				if (valFloat >= 0 && valFloat <= 1) {
					var values = this.setValue({valFloat: valFloat})
				}

				if(e.type !== "mousedown") this.$input.trigger("sliderMove", values, e)
				return this
			},

			focus: function (e) {

				this.$handle.off('keydown', this.keyDown)
				this.$handle.off('blur', this.blur)
				this.$handle.off('focus', this.focus)
				this.$handle.on('keydown', this.keyDown)
				this.$handle.on('blur', this.blur)
				this.$input.trigger("sliderFocus", e)
			},

			blur: function (e) {
				this.$handle.off('keydown', this.keyDown)
				this.$handle.off('blur', this.blur)
				this.$handle.on('focus', this.focus)
				this.$input.trigger("sliderBlur", e)
			},

			keyDown: function(e){
				e.preventDefault()
				var code = e.keyCode || e.which
				var modificator = 1 + 6*(e.shiftKey) + 6*(e.ctrlKey)

				switch (code) {
					case 38: // Up arrow
					case 39: // Right arrow
						var newVal = this.val + modificator * this.step
						if (newVal <= this.max) this.setValue(newVal)
						else                    this.setValue(this.max)
						break;
					case 37: // Left arrow
					case 40: // Down arrow
						var newVal = this.val - modificator * this.step
						if (newVal >= this.min) this.setValue(newVal)
						else                    this.setValue(this.min)
						break;
					default:
						if (code >=48 && code <=57) { // digits
							this.keyboardInput( String.fromCharCode(code) )
						} else if (code >=96 && code <=105) { // numpad digits
							this.keyboardInput( String.fromCharCode(code-48) )
						} else if (code == 188 || code == 190 || code == 110) {
							this.keyboardInput(".")
						} else if (code == 109 || code == 189) {
							this.keyboardInput("-")
						}
				}
				this.$input.trigger("sliderKeydown", e)
			},

			keyboardInput: function(symbol) {
				var newBuffer = keyboardInputBuffer + symbol
				newBuffer = ~newBuffer.lastIndexOf("-") ? newBuffer.substr(newBuffer.lastIndexOf("-")) : newBuffer
				var val = parseFloat(newBuffer);
				if (newBuffer == "." || newBuffer == "-") val = parseFloat(newBuffer + '0')

				while (val>this.max) {
					newBuffer = newBuffer.substr(1)
					val = parseFloat(newBuffer)
				}
				var isValAcceptable = (val >= this.min && val <= this.max && (val/this.step).toPrecision(10)%1==0)
				var isNonDigit = (newBuffer == "." || newBuffer == "-")


				if (isValAcceptable || isNonDigit) {
					this.setValue(val)
					keyboardInputBuffer = newBuffer
					clearTimeout(keyboardInputTimeout)
					keyboardInputTimeout = setTimeout(function(){
						keyboardInputBuffer = ""
						keyboardInputTimeout = null
					}, 2000)
				}
			}
		}

		this.each(function(){
			if (!$(this).data("RangeSelector")) {
				$(this).data("RangeSelector", new RangeSelector(this))
			}
		});
	}

	$.rangeSelector = function(){
		$("input[type='range']").rangeSelector();
	};




	// http://davidwalsh.name/detect-node-insertion
	;(function(){
		var insertListener = function(e){
			if (e.animationName == "nodeInserted") {
				$(e.target).rangeSelector()
			}
		}

		document.addEventListener("animationstart", insertListener, false); // standard + firefox
		document.addEventListener("oAnimationEnd", insertListener, false); // Opera
		document.addEventListener("MSAnimationStart", insertListener, false); // IE
		document.addEventListener("webkitAnimationStart", insertListener, false); // Chrome + Safari
	})()
})