import React, { useMemo } from 'react';
import Slider from '@mui/material/Slider';

const MINUTES_DAY = 1435;
const MIN_DISTANCE = 5;

function TimeRangeSlider({
                             startTime,
                             endTime,
                             onChange,
                             timeToSlider,
                             sliderToTime,
                             hasError,
                             currentTimeStr
                         }) {


    const sliderValue = useMemo(() => [
        timeToSlider(startTime || currentTimeStr),
        timeToSlider(endTime || "23:59")
    ], [startTime, endTime, currentTimeStr, timeToSlider]);

    const handleSliderChange = (event, newValue) => {
        const [start, end] = newValue;
        if (end - start < MIN_DISTANCE) return;
        onChange(sliderToTime(start), sliderToTime(end));
    };

    return (
        <div className="slider-container">
            <Slider
                value={sliderValue}
                onChange={handleSliderChange}
                min={0}
                max={MINUTES_DAY}
                step={5}
                disableSwap
                valueLabelDisplay="auto"
                valueLabelFormat={sliderToTime}
                className={`custom-slider ${hasError ? 'slider-error' : 'slider-standard'}`}
            />

            <div className="slider-footer">
                <span>Jetzt ({currentTimeStr})</span>
                <span>In 24h</span>
            </div>
        </div>
    );
}

export default TimeRangeSlider;