<script setup>
import {onMounted, ref, watch} from "vue"
import clickupService from "@/clickup-service";
import {ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip} from 'chart.js'
import {Bar, Doughnut} from 'vue-chartjs'
import store from "@/store";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  open: Boolean,
  events: Array
})

let loading = ref(false);

// Days of week chart
let daysOfWeekChartData = ref({datasets: []});
let daysOfWeekChartOptions = ref({
  plugins: {
    title: {
      display: false,
    },
  },
  maintainAspectRatio: false,
  responsive: true,
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true
    }
  }
})
let daysOfWeekChartStyles = ref({
  position: 'relative',
  width: '100%',
  height: '225px'
})

// Week chart
let weekChartData = ref({datasets: []});
let weekChartOptions = ref({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
  }
})
let weekChartStyles = ref({
  position: 'relative',
  height: '225px'
})
let weekChartPlugins = {
  afterDraw: (chart) => {
    let ctx = chart.ctx;
    if (chart.data.datasets.length === 0) return;
    let totalHours = Math.round(chart.data.datasets[0].data.reduce((a, b) => a + b, 0));
    let txtX = Math.round((chart.width - ctx.measureText(totalHours).width) / 2);
    let txtY = Math.round((chart.height + 35) / 2);
    ctx.font = '60px Avenir, Helvetica, Arial, sans-serif';
    ctx.fillText(totalHours, txtX, txtY);
  }
};

// Goals chart
let goalsChartOptions = ref({
  indexAxis: 'y',
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
  }
})
let goalsChartStyles = ref({
  position: 'relative',
  height: '225px',
})

// Globals
let spaces = []
let goalCharts = {}

onMounted(() => {
  clickupService.getSpaces().then(found_spaces => {
    spaces.value = found_spaces
  }).catch(error => {
    console.error(error)
  })
})

watch(() => props.open, open => {
  const vueCalRoots = document.getElementsByClassName('vuecal')
  if (!vueCalRoots.length) return;
  if (open) {
    return vueCalRoots[0].classList.add('vuecal--time-tracking-statistics-open')
  }
  return vueCalRoots[0].classList.remove('vuecal--time-tracking-statistics-open')
})

watch(() => props.events, events => {
  if (!events.length) {
    daysOfWeekChartData.value = {datasets: []}
    weekChartData.value = {datasets: []}
    return;
  }
  buildEventsData(events)
})

async function buildEventsData(events) {
  await Promise.all(events.map(async event => {
    let foundSpace = spaces.value.find(space => space.id === event.spaceId);
    return {
      spaceName: (foundSpace) ? foundSpace.name : "Unknown space",
      color: (foundSpace) ? foundSpace.color : "#ADD8E67F",
      startDate: new Date(event.start).toISOString().split('T')[0],
      endDate: new Date(event.end).toISOString().split('T')[0],
      durationInHours: (new Date(event.end) - new Date(event.start)) / 3600000
    }
  })).then(processedEvents => {
    buildDaysOfWeekChart(processedEvents)
    buildWeekChart(processedEvents)
    buildGoalsCharts(processedEvents)
  }).catch(error => {
    console.error(error)
  })
}

// Build days of week chart data
async function buildDaysOfWeekChart(processedEvents) {
  // Get all dates of given week

  const weekLength = (!store.get('settings.show_weekend')) ? 5 : 7
  let startDate = new Date(props.events[0].start)
  let weekDates = [];

  for (let i = 1; i < weekLength + 1; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() - day.getDay() + i);
    weekDates.push(day);
  }

  const uniqueDates = weekDates.map(date => date.toISOString().split('T')[0])
  let uniqueSpaces = [...new Set(processedEvents.map(event => event.spaceName))]
  daysOfWeekChartData.value = {
    labels: uniqueDates,
    datasets: uniqueSpaces.map(space => {
      let spaceEvents = processedEvents.filter(event => event.spaceName === space)
      let spaceEventsDuration = uniqueDates.map(date => {
        let dateEvents = spaceEvents.filter(event => event.startDate === date)
        return dateEvents.reduce((accumulator, currentValue) => accumulator + currentValue.durationInHours, 0)
      })
      return {
        label: space,
        backgroundColor: spaceEvents[0].color,
        data: spaceEventsDuration
      }
    })
  }
}

async function buildGoalsCharts(processedEvents) {
  // Build a chart for each space, all but them to the goalsCharts object
  console.log(spaces.value)
  for(let space of spaces.value) {
    console.log(space)
    let spaceEvents = processedEvents.filter(event => event.spaceName === space)
    let spaceEventsDuration = spaceEvents.reduce((accumulator, currentValue) => accumulator + currentValue.durationInHours, 0)
    goalCharts[space] = {
      labels: [space],
      datasets: [{
        label: space,
        data: [spaceEventsDuration],
        backgroundColor: [space.color],
        borderWidth: 0
      }]
    }
  }
  console.log(goalCharts)
}

// Week chart
// TODO: The week doughnut chart is not being emptied when the week changes, so the totals keep adding up.
async function buildWeekChart(processedEvents) {
  const groupedEvents = processedEvents.reduce((acc, event) => {
    if (!acc[event.spaceName]) {
      acc[event.spaceName] = 0
    }
    acc[event.spaceName] += event.durationInHours;
    return acc;
  }, {});

  let colors = []
  for (let spaceGroupedEvent in groupedEvents) {
    let foundSpace = processedEvents.find(event => event.spaceName === spaceGroupedEvent)
    colors.push(foundSpace.color)
  }

  weekChartData.value = {
    labels: Object.keys(groupedEvents),
    datasets: [{
      data: Object.values(groupedEvents),
      backgroundColor: colors,
      borderWidth: 0
    }]
  }
}


</script>

<template>
  <Transition name="time-tracking-statistics">
    <div v-show="open"
         class="time-tracking-statistics select-none flex fixed top-0 inset-x-0 bg-white z-10 shadow-inner drop-shadow-xl h-[500px]">

      <!-- START: Loading state
      TODO: Implement this
      <div v-if="loading" class="self-center w-full text-center">
        Hold on, fetching time tracking data from workspace...
      </div>
      -->
      <!-- START: Empty state
      TODO: Implement this
      <div v-if="!loading" class="self-center w-full text-center">
        Looks like no data could be found for this workspace.
      </div>
      -->

      <div v-if="!loading"
           class="items-end h-full w-full pl-3 pb-1 overflow-x-scroll align-text-top grid grid-rows-2 gap-1 statistics-container">

        <div class="grid grid-cols-3 gap-4">
          <div class="chart-container">
            <Doughnut :data="weekChartData" :options="weekChartOptions" :style="weekChartStyles"
                      :plugins="[weekChartPlugins]"/>
          </div>
          <div class="col-span-2 chart-container">
            <div v-for="(chart, index) in goalCharts" :key="index">
              <Bar :data="chart" :options="goalsChartOptions" :style="goalsChartStyles"/>
            </div>
          </div>
        </div>
        <div class="">
          <Bar :data="daysOfWeekChartData" :options="daysOfWeekChartOptions" :style="daysOfWeekChartStyles"/>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.time-tracking-statistics {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  -webkit-app-region: drag;
}

/* Time tracking statistics transition */
/*
  This uses are used by the <Transition> component.
  Might appear to be unused, but they are not.
 */
.time-tracking-statistics-enter-active {
  transition: all 0.2s ease;
}

.time-tracking-statistics-leave-active {
  /* transition: all 0.2s ease; */
}

.time-tracking-statistics-enter-from,
.time-tracking-statistics-leave-to {
  top: -500px;
  opacity: 0;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 225px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* VueCal top margin transition */
.vuecal {
  transition: all 0.2s ease;
}

.vuecal.vuecal--time-tracking-statistics-open {
  margin-top: 500px;
}

/* Hide scrollbar */
.statistics-container::-webkit-scrollbar {
  display: none;
}
</style>