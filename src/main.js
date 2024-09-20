/*
 * Copyright © 2023. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Create the read function.
     */
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize(), mod.property("myProperty"));

    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);

    /**
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.ModProperty<string>} prop
     */
    async function render(dataView, windowSize, prop) {

        //parse spotfire data to get hours (x axis), days (y axis) and values (size by)
        //make sure to add the axis on the mod-manifest.json file

        const rows = await dataView.allRows();
        let data = [];
        
        // Extract and log data
        rows.forEach(row => {
            let hour = row.categorical("X").formattedValue();
            let day = row.categorical("Y").formattedValue();
            let size = row.continuous("Size by").value();
            let color = row.color().hexCode;
            data.push([day,hour,size, color]);
        });
        
        // Extract unique days and hours
        let days = new Set();
        let hours = new Set();
        let colors = new Set();
        
        data.forEach(item => {
            days.add(item[0]);
            hours.add(item[1]);
            colors.add(item[3]);
        });
        
        days = Array.from(days);
        hours = Array.from(hours);
        colors = Array.from(colors);

        // Replace day strings in data with their corresponding indices from days array
        data = data.map(item => {
            let dayIndex = days.indexOf(item[0]);
            return [dayIndex, item[1], item[2]];
        });

        //remove previous chart
        var dom = document.getElementById('mod-container');
        echarts.dispose(dom);

        //create new chart
        var myChart = echarts.init(dom, null, {
            renderer: 'canvas',
            useDirtyRect: false
        });
        var app = {};

        var option;  

        const title = [];
        const singleAxis = [];
        const series = [];

        const numDays = days.length;
        days.forEach(function (day, idx) {
            title.push({
                textBaseline: 'middle',
                // Adjust the top position based on the number of days
                top: ((idx + 0.5) * 100) / numDays + '%',
                text: day
            });

            singleAxis.push({
                left: 150,
                type: 'category',
                boundaryGap: false,
                data: hours,
                // Adjust the top and height based on the number of days
                top: (idx * 100) / numDays + 5 + '%',
                height: 100 / numDays - 10 + '%',
                axisLabel: {
                    interval: 2
                }
            });

            series.push({
                singleAxisIndex: idx,
                coordinateSystem: 'singleAxis',
                type: 'scatter',
                data: [],
                symbolSize: function (dataItem) {
                    return dataItem[1] * 4;
                },
                itemStyle:{
                    color: colors[idx]
                }
            });
        });


        data.forEach(function (dataItem) {
            if (dataItem[0] < series.length) {
                series[dataItem[0]].data.push([dataItem[1], dataItem[2]]);
            } else {
                0;//console.error('Invalid dayOfWeekIndex in data:', dataItem[0]);
            }
        }); 


        option = {
            animation: false,
            tooltip: {
                position: 'top'
            },
            title: title,
            singleAxis: singleAxis,
            series: series
        };


        if (option && typeof option === 'object') {
            myChart.setOption(option);
        }

        window.addEventListener('resize', myChart.resize);

        /**
         * Signal that the mod is ready for export.
         */
        context.signalRenderComplete();
    }
});
