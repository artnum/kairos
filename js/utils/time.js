const TimeUtils = {
    toHourString (seconds) {
        let hours = Math.floor(seconds / 3600)
        let minutes = Math.floor((seconds / 60) - (hours * 60))
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    },
    toDateString (date) {
        const object = new Date(date)
        return object.toLocaleDateString()
    }
}