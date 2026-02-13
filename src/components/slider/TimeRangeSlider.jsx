/**
 * TimeRangeSlider - Reusable dual-slider for selecting start and end times within 24h.
 * Uses Material-UI Slider with minimum distance enforcement between handles.
 * @param {object} props
 * @param {string} props.startTime - Current start time in HH:MM format (e.g., "08:00")
 * @param {string} props.endTime - Current end time in HH:MM format (e.g., "18:00")
 * @param {Function} props.onChange - Callback(startTime, endTime) when slider changes
 * @param {Function} props.timeToSlider - Convert HH:MM format to slider minute value
 * @param {Function} props.sliderToTime - Convert slider minute value to HH:MM format
 * @param {boolean} [props.hasError=false] - Apply error styling if true
 * @param {string} props.currentTimeStr - Current time in HH:MM format for reference
 * @returns {JSX.Element} Slider component
 */
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