
        class TimeSlider extends Polymer.Element {
            static get is() {
                return "time-slider";
            }

            constructor() {
                super();
                this.showCurrentEvent();
            }

            async showCurrentEvent() {
                var events = await getCurrentEvents();
        
                if (events.length > 0) {
                    for (var i = 0; i < events.length; i++) {
                        var event = events[i];
                        var start = event.start.dateTime;
                        var end = event.end.dateTime;
                        if (!start) {
                            start = event.start.date;
                            end = event.end.date;
                        }
                        var startTime = new Date(start);
                        var endTime = new Date(end);
        
                        document.getElementById("current-event-name").innerHTML = event.summary;
        
                        const startTimeElt = <HTMLTimeElement>document.getElementById("current-event-start");
                        const endTimeElt = <HTMLTimeElement>document.getElementById("current-event-end");
                        
                        startTimeElt.innerHTML = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        startTimeElt.dateTime = startTime.toISOString();
        
                        endTimeElt.innerHTML = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        endTimeElt.dateTime = endTime.toISOString();
                        
                        var c = <HTMLCanvasElement>document.getElementById("progress-indicator");
                        var ctx = c.getContext("2d");
                        ctx.strokeStyle = "#666";
        
                        this.placeSliderPosition(startTime, endTime, ctx, c);
                        window.setInterval(() => this.placeSliderPosition(startTime, endTime, ctx, c), 1000);
                    }
                } else { // no current event
                }
            }
            placeSliderPosition(startTime: Date, endTime: Date, ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
                ctx.clearRect(0, 0, c.width, c.height);
                ctx.beginPath();
                ctx.moveTo(0, 5);
                ctx.lineTo(300, 5);
                ctx.stroke();
                const now = new Date();
                const pct = (now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())
                ctx.moveTo(pct * 300, 0);
                ctx.lineTo(pct * 300, 10);
                ctx.stroke();
              }
              
        }

        customElements.define(TimeSlider.is, TimeSlider);


        
             
