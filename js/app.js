const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = searchForm.querySelector('button[type="submit"]');

const statusElement = document.getElementById("status");
const weatherCard = document.getElementById("weather-card");
const cityNameElement = document.getElementById("city-name");
const temperatureElement = document.getElementById("temperature");
const weatherDescriptionElement = document.getElementById("weather-description");
const humidityElement = document.getElementById("humidity");
const windSpeedElement = document.getElementById("wind-speed");
const forecastSection = document.getElementById("forecast");
const forecastContainer = document.getElementById("forecast-container");
const weatherIconElement = document.getElementById("weather-icon");
const tempMaxElement = document.getElementById("temp-max");
const tempMinElement = document.getElementById("temp-min");

let activeController = null;

const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",

  45: "Fog",
  48: "Depositing rime fog",

  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",

  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",

  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",

  66: "Light freezing rain",
  67: "Heavy freezing rain",

  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",

  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",

  85: "Slight snow showers",
  86: "Heavy snow showers",

  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function saveCity(name) {
  try {
    localStorage.setItem("lastCity", name);
  } catch {

  }
}

function loadCity() {
  try {
    return localStorage.getItem("lastCity");
  } catch {
    return null;
  }
}

async function getCoordinates(city, signal) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status})`);
  }
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    const error = new Error("City not found");
    error.code = "CITY_NOT_FOUND";
    throw error;
  }
  return {
    latitude: data.results[0].latitude,
    longitude: data.results[0].longitude,
    name: data.results[0].name
  };
}

async function getWeather(latitude, longitude, signal) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=5&timezone=auto`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }

  const data = await response.json();
  return data;
}

function renderWeather(data) {
  forecastContainer.replaceChildren();

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  for (let i = 0; i < data.daily.time.length; i++) {
    const date = data.daily.time[i];
    const formattedDate = dateFormatter.format(new Date(`${date}T12:00:00`));
    const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
    const minTemp = Math.round(data.daily.temperature_2m_min[i]);
    const weatherCode = data.daily.weather_code[i];
    const description = getWeatherDescription(weatherCode);

    const card = document.createElement("li");
    card.classList.add("card", "forecast-card");

    const dateElement = document.createElement("p");
    dateElement.classList.add("forecast-date");
    dateElement.textContent = formattedDate;
    card.appendChild(dateElement);

    const iconElement = document.createElement("p");
    iconElement.classList.add("forecast-icon");
    iconElement.textContent = getWeatherIcon(weatherCode);
    iconElement.setAttribute("aria-hidden", "true");
    card.appendChild(iconElement);

    const temperatureRangeElement = document.createElement("p");
    temperatureRangeElement.classList.add("forecast-temperature");
    const maxElement = document.createElement("span");
    maxElement.classList.add("temp-max");
    maxElement.textContent = `↑ ${maxTemp}°C`;
    const minElement = document.createElement("span");
    minElement.classList.add("temp-min");
    minElement.textContent = `↓ ${minTemp}°C`;
    temperatureRangeElement.appendChild(maxElement);
    temperatureRangeElement.appendChild(minElement);
    card.appendChild(temperatureRangeElement);
   
    const descriptionElement = document.createElement("p");
    descriptionElement.classList.add("forecast-description");
    descriptionElement.textContent = description;
    card.appendChild(descriptionElement);

    forecastContainer.appendChild(card);
  }
  
  temperatureElement.textContent = `${Math.round(data.current.temperature_2m)}°C`
  tempMaxElement.textContent = `↑ ${Math.round(data.daily.temperature_2m_max[0])}°C`;
  tempMinElement.textContent = `↓ ${Math.round(data.daily.temperature_2m_min[0])}°C`;
  humidityElement.textContent = `${data.current.relative_humidity_2m}%`;
  windSpeedElement.textContent = `${Math.round(data.current.wind_speed_10m)} km/h`;
  weatherDescriptionElement.textContent = getWeatherDescription(data.current.weather_code);
  weatherIconElement.textContent = getWeatherIcon(data.current.weather_code);
}

function getWeatherDescription(code) {
  return weatherCodes[code] ?? "Unknown weather";
}

function getWeatherIcon(code) {
  if (code === 0) {
    return "☀️";
  } else if (code === 1 || code === 2) {
    return "🌤️";
  } else if (code === 3) {
    return "☁️";
  } else if (code === 45 || code === 48) {
    return "🌫️";
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    return "🌦️";
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "🌧️";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "❄️";
  } else if ([95, 96, 99].includes(code)) {
    return "⛈️";
  } else {
    return "❓";
  }
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    statusElement.classList.remove("is-error");
    statusElement.textContent = "Enter a city to search.";
    return;
  }

  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;

  weatherCard.hidden = true;
  forecastSection.hidden = true;
  statusElement.classList.remove("is-error");
  statusElement.textContent = "Loading weather…";
  searchButton.disabled = true;
  searchButton.textContent = "Searching...";


  try {
    const coordinates = await getCoordinates(city, controller.signal);

    const weatherData = await getWeather(
      coordinates.latitude,
      coordinates.longitude,
      controller.signal
    );

    if (activeController !== controller) {
      return;
    }

    renderWeather(weatherData);

    weatherCard.hidden = false;
    forecastSection.hidden = false;
    cityNameElement.textContent = coordinates.name;
    statusElement.classList.remove("is-error");
    statusElement.textContent = "";
    saveCity(coordinates.name);
  } catch (error) {
    if (error.name === "AbortError" || activeController !== controller) {
      return;
    }

    console.error(error);

    statusElement.classList.add("is-error");
    if (error.code === "CITY_NOT_FOUND") {
      statusElement.textContent = "City not found. Please check the spelling.";
    } else {
      statusElement.textContent = "Couldn't load weather. Please try again.";
    }
  }
  finally {
    if (activeController === controller) {
      activeController = null;
      searchButton.disabled = false;
      searchButton.textContent = "Search";
    }
  }
});

const savedCity = loadCity();

if (savedCity) {
  cityInput.value = savedCity;
  searchForm.requestSubmit();
}

