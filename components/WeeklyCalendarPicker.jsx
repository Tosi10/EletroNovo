import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { icons } from '../constants';
import { Image } from 'react-native';

const WeeklyCalendarPicker = ({ onSelectDate, selectedDate }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  useEffect(() => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - date.getDay()); // Go to Sunday of the week
    setCurrentWeekStart(date);
  }, [selectedDate]);

  const getWeekDays = useCallback((startDate) => {
    const days = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Go to Sunday of the week

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  const weekDays = getWeekDays(currentWeekStart);

  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  }, []);

  const handleDayPress = useCallback((day) => {
    onSelectDate(day.toISOString().slice(0, 10));
  }, [onSelectDate]);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.monthYearText}>
          {currentWeekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <View style={styles.weekNavigationContainer}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.arrowButton}>
          <Image source={icons.leftArrow} style={styles.arrowIcon} />
        </TouchableOpacity>
        <View style={styles.daysContainer}>
          {weekDays.map((day, index) => {
            const dayString = day.toISOString().slice(0, 10);
            const isSelected = dayString === selectedDate;
            const isToday = dayString === new Date().toISOString().slice(0, 10);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDayPress(day)}
                style={[styles.dayButton, isSelected && styles.selectedDayButton]}
              >
                <Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && styles.todayText]}>
                  {day.getDate()}
                </Text>
                <Text style={[styles.dayOfWeekText, isSelected && styles.selectedDayText, isToday && styles.todayText]}>
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={goToNextWeek} style={styles.arrowButton}>
          <Image source={icons.rightArrow} style={styles.arrowIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
    backgroundColor: '#1E1E2D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  monthYearText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  weekNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  arrowButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  arrowIcon: {
    width: 29,
    height: 24,
    tintColor: '#FFA001',
  },
  daysContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    marginHorizontal: 2,
    borderRadius: 5,
  },
  selectedDayButton: {
    backgroundColor: '#FFA001',
  },
  dayText: {
    color: '#d9e1e8',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  todayText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  dayOfWeekText: {
    color: '#b6c1cd',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 2,
  },
});

export default WeeklyCalendarPicker;
