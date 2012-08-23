/*
 * Flot plugin for selecting a range in a graph by moving/resizing a selection area on a second graph
 * 
 * Version 1.0
 *
 * Released under the MIT license by Troels Bang Jensen, August 2012
 * 
 * 
 */

(function($){
    function init(plot){
        //Internal variables
        var rangeselection = {
          start:  null,
          end: null,
          active: false,
          moveStart: 0,
          movex: 0,
          handle: "",
          color: "#fbb"
        };
        var savedhandlers = {};
        var mouseUpHandler = null;
        var mouseFuzz = 5;
        function onMouseMove(e){
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            if(!rangeselection.active){   
                var xaxis = plot.getAxes().xaxis;
                var f = xaxis.p2c(rangeselection.start);
                var s = xaxis.p2c(rangeselection.end);
                var tolerance = mouseFuzz;
                if(Math.abs(f - x) < tolerance && f > 0){
                    document.body.style.cursor = 'w-resize';
                }else if(Math.abs(s - x) < tolerance && s < plot.width()){
                    document.body.style.cursor = 'e-resize';
                }else if(x > f && x < s){
                    document.body.style.cursor = 'move';
                }else{
                    document.body.style.cursor = 'auto';
                }
                return;
            }
            rangeselection.movex = x;
            plot.triggerRedrawOverlay();
        }
        function onMouseDown(e){
            if(e.which != 1) // Only accept left-clicks
                return;
            
            //Cancel out any text selections
            document.body.focus();
            
             // prevent text selection and drag in old-school browsers
            if (document.onselectstart !== undefined && savedhandlers.onselectstart == null) {
                savedhandlers.onselectstart = document.onselectstart;
                document.onselectstart = function () { return false; };
            }
            if (document.ondrag !== undefined && savedhandlers.ondrag == null) {
                savedhandlers.ondrag = document.ondrag;
                document.ondrag = function () { return false; };
            }

            // this is a bit silly, but we have to use a closure to be
            // able to whack the same handler again
            mouseUpHandler = function (e) { onMouseUp(e); };
            
            
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(rangeselection.start);
            var s = xaxis.p2c(rangeselection.end);
            var tolerance = mouseFuzz;
            if(Math.abs(f - x) <= tolerance){
                document.body.style.cursor = 'w-resize';
                rangeselection.handle = "start";
                rangeselection.active = true;
            }else if(Math.abs(s - x) <= tolerance){
                document.body.style.cursor = 'e-resize';
                rangeselection.handle = "end";
                rangeselection.active = true;
            }else{ // if(x > f && x < s)
                document.body.style.cursor = 'move';
                rangeselection.handle = "move";
                rangeselection.moveStart = s - (s - f) / 2;
                rangeselection.active = true;
            }
            
            
            mouseUpHandler = function(e) { onMouseUp(e);};
            $(document).one("mouseup", mouseUpHandler);
        }
        function onMouseUp(e){
            mouseUpHandler = null;
            document.body.style.cursor = 'auto';
            rangeselection.active = false;
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(rangeselection.start);
            var s = xaxis.p2c(rangeselection.end);
             switch(rangeselection.handle){
                    case "start":
                        f = x;
                        if(x < 0)
                            f = 0;
                        if(x > s - 10)
                            f = s - 10; //Minimum size of selection
                    break;
                    case "end":
                        s = x;
                        if(x > plot.width())
                            s = plot.width();
                        if(x < f + 10)
                            s = f + 10; //Minimum size of selection

                    break;
                    case "move":
                        var dx = x -  rangeselection.moveStart;
                        if(f + dx < 0){
                            s -= f;
                            f = 0;
                        }else if (s+dx > plot.width()){
                            f = plot.width() - (s - f);
                            s = plot.width();
                        }else{
                            s += dx;
                            f += dx;
                        }
                    break; 
                }
            rangeselection.start = xaxis.c2p(f);
            rangeselection.end = xaxis.c2p(s);
            var o = plot.getOptions();
            plot.triggerRedrawOverlay();
            if(o.rangeselection.callback && typeof(o.rangeselection.callback) === "function"){
                o.rangeselection.callback({start: rangeselection.start, end: rangeselection.end});
            }
            return false;
        }
        function clamp(min, value, max){
            return value < min ? min : ( value > max ? max : value);
        }
        function roundedRect(ctx,x,y,width,height,radius,fill,stroke){
            ctx.save();	// save the context so we don't mess up others
            ctx.beginPath();

            // draw top and top right corner
            ctx.moveTo(x+radius,y);
            ctx.arcTo(x+width,y,x+width,y+radius,radius);

            // draw right side and bottom right corner
            ctx.arcTo(x+width,y+height,x+width-radius,y+height,radius); 

            // draw bottom and bottom left corner
            ctx.arcTo(x,y+height,x,y+height-radius,radius);

            // draw left and top left corner
            ctx.arcTo(x,y,x+radius,y,radius);

            if(fill){
                ctx.fill();
            }
            if(stroke){
                ctx.stroke();
            }
            ctx.restore();	// restore context to what it was on entry  
        }
        function drawSelection(plot, ctx, start, end){
            var o = plot.getOptions();
            var plotOffset = plot.getPlotOffset();
            
            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);
            var c = $.color.parse(o.rangeselection.color);
            ctx.strokeStyle = c.scale('a', 0.9).toString();
            ctx.lineWidth = 3;
            ctx.lineJoin = "round";
            ctx.fillStyle = c.scale('a', 0.4).toString();
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(start);
            var s = xaxis.p2c(end);
            var x = f,
                y = 0,
                w = s-f,
                h = plot.height();
            roundedRect(ctx,x,y,w,h,3, true, true);
            ctx.restore();
        }
        plot.hooks.bindEvents.push(function(plot, eventHolder){
           var o = plot.getOptions();         
           eventHolder.mousemove(onMouseMove);
           eventHolder.mousedown(onMouseDown);
        });
        plot.hooks.draw.push(function(plot, ctx){
           plot.triggerRedrawOverlay(); 
        });
        plot.hooks.drawOverlay.push(function(plot, ctx){
            var o = plot.getOptions();
            if(!o.rangeselection.enabled)
                return;
            if(rangeselection.active){
                 var xaxis = plot.getAxes().xaxis;
                
                var x = rangeselection.movex;
                var f = xaxis.p2c(rangeselection.start);
                var s = xaxis.p2c(rangeselection.end);
                switch(rangeselection.handle){
                    case "start":
                        f = x;
                        if(x < 0)
                            f = 0;
                        if(x > s - 10)
                            f = s - 10; //Minimum size of selection
                    break;
                    case "end":
                        s = x;
                        if(x > plot.width())
                            s = plot.width();
                        if(x < f + 10)
                            s = f + 10; //Minimum size of selection

                    break;
                    case "move":
                        var dx = x -  rangeselection.moveStart;
                        if(f + dx < 0){
                            s -= f;
                            f = 0;
                        }else if (s+dx > plot.width()){
                            f = plot.width() - (s - f);
                            s = plot.width();
                        }else{
                            s += dx;
                            f += dx;
                        }
                    break; 
                }
                ctx.clearRect(0,0,plot.width(),plot.height());
                drawSelection(plot, ctx,  xaxis.c2p(f),  xaxis.c2p(s));
                return;
            }
            var series,data;                
            if(rangeselection.end === null){
                if(o.rangeselection.end === null){
                    series = plot.getData();
                    data = series[0].data;
                    rangeselection.end = data[data.length-1][0];
                }else{
                    rangeselection.end = o.rangeselection.end;
                }
            }
            if(rangeselection.start === null){
                if(o.rangeselection.start === null){
                    series = plot.getData();
                    data = series[0].data;
                    var date = new Date(rangeselection.end);
                    if(date.getMonth() > 0){
                        date.setMonth(date.getMonth() - 1);
                    }else{
                        date.setYear(date.getYear() - 1);
                        date.setMonth(11);
                    }
                    if(data[0][0] > date.valueOf()){
                        rangeselection.start = data[0][0];
                    }else{
                        rangeselection.start = date.valueOf();
                    }
                }else{
                    rangeselection.start = o.rangeselection.start;
                }
                
            }
            drawSelection(plot, ctx, rangeselection.start, rangeselection.end);
            
        });
        plot.hooks.shutdown.push(function(plot, eventHolder){
           eventHolder.unbind("mousemove", onMouseMove);
           eventHolder.unbind("mousedown", onMouseDown);
           if(mouseUpHandler)
               $(document).unbind("mouseup", mouseUpHandler);
        });
    }
    $.plot.plugins.push({
       init: init,
       options: {
           rangeselection: {
               color: "#f88",
               start: null,
               enabled: false,
               end: null,
               callback: null
           }
       },
       name: 'rangeselector',
       version: '0.1'
    });
})(jQuery);
