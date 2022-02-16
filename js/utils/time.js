const TimeUtils = {
    toHourString (seconds) {
        let hours = (seconds / 3600).toFixed(0)
        let minutes = ((seconds / 60) - (hours * 60)).toFixed(0)
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    }
}