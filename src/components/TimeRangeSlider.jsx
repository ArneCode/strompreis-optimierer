import React from 'react';
import Slider from '@mui/material/Slider';

function TimeRangeSlider({
                             startTime,
                             endTime,
                             onChange,
                             timeToSlider,
                             sliderToTime,
                             hasError,
                             currentTimeStr
                         }) {
    const sliderValue = [
        timeToSlider(startTime || currentTimeStr),
        timeToSlider(endTime || "23:59")
    ];

    const handleSliderChange = (event, newValue) => {
        const [newStart, newEnd] = newValue;
        if (newEnd - newStart < 5) return;

        onChange(sliderToTime(newStart), sliderToTime(newEnd));
    };

    return (
        <div className="slider-container">
            <Slider
                value={sliderValue}
                onChange={handleSliderChange}
                min={0}
                max={1435}
                step={5}
                disableSwap
                valueLabelDisplay="auto"
                valueLabelFormat={(val) => sliderToTime(val)}
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