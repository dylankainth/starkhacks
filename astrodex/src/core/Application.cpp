#include "core/Application.hpp"

#include <glad/gl.h>
#include <GLFW/glfw3.h>
#include <imgui.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <thread>

#include "config/SystemConfig.hpp"
#include "core/Logger.hpp"
#include "data/ExoplanetPredictor.hpp"
#include "explorer/FreeFlyCamera.hpp"
#include "intro/IntroAnimation.hpp"
#include "render/Camera.hpp"
#include "render/ExoplanetConverter.hpp"
#include "render/Renderer.hpp"

namespace astrocore {

static ExoplanetData makeSolarSystemData(const std::string& name) {
    ExoplanetData d;
    d.name = name;
    d.host_star.name = "Sun";
    d.host_star.spectral_type = "G2V";
    d.host_star.effective_temp_k = MeasuredValue<double>(5778.0, DataSource::CALCULATED);
    d.host_star.mass_solar = MeasuredValue<double>(1.0, DataSource::CALCULATED);
    d.host_star.radius_solar = MeasuredValue<double>(1.0, DataSource::CALCULATED);
    d.host_star.luminosity_solar = MeasuredValue<double>(1.0, DataSource::CALCULATED);
    d.host_star.age_gyr = MeasuredValue<double>(4.6, DataSource::CALCULATED);
    d.host_star.distance_pc = MeasuredValue<double>(0.0, DataSource::CALCULATED);
    d.distance_ly = MeasuredValue<double>(0.0, DataSource::CALCULATED);

    if (name == "Mercury") {
        d.mass_earth = MeasuredValue<double>(0.055, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(0.383, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(5.43, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(440.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(87.97, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(0.387, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.206, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(0.38, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Rocky", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.068, DataSource::CALCULATED);
    } else if (name == "Venus") {
        d.mass_earth = MeasuredValue<double>(0.815, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(0.949, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(5.24, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(737.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(224.7, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(0.723, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.007, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(0.90, DataSource::CALCULATED);
        d.surface_pressure_atm = MeasuredValue<double>(92.0, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Volcanic", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("CO2 96.5%, N2 3.5%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.77, DataSource::CALCULATED);
    } else if (name == "Earth") {
        d.mass_earth = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(5.51, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(288.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(365.25, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.017, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.surface_pressure_atm = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.insolation_flux = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.ocean_coverage_fraction = MeasuredValue<double>(0.71, DataSource::CALCULATED);
        d.earth_similarity_index = MeasuredValue<double>(1.0, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Terrestrial", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("N2 78%, O2 21%, Ar 0.9%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.306, DataSource::CALCULATED);
    } else if (name == "Mars") {
        d.mass_earth = MeasuredValue<double>(0.107, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(0.532, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(3.93, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(210.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(687.0, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(1.524, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.093, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(0.38, DataSource::CALCULATED);
        d.surface_pressure_atm = MeasuredValue<double>(0.006, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Desert", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("CO2 95%, N2 2.7%, Ar 1.6%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.25, DataSource::CALCULATED);
    } else if (name == "Jupiter") {
        d.mass_earth = MeasuredValue<double>(317.8, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(11.21, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(1.33, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(165.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(4333.0, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(5.203, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.049, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(2.53, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Gas Giant", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("H2 89%, He 10%, CH4 0.3%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.503, DataSource::CALCULATED);
    } else if (name == "Saturn") {
        d.mass_earth = MeasuredValue<double>(95.2, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(9.45, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(0.687, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(134.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(10759.0, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(9.537, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.054, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(1.07, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Gas Giant", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("H2 96%, He 3%, CH4 0.4%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.342, DataSource::CALCULATED);
    } else if (name == "Neptune") {
        d.mass_earth = MeasuredValue<double>(17.15, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(3.88, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(1.64, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(72.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(60190.0, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(30.07, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.009, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(1.14, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Ice Giant", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("H2 80%, He 19%, CH4 1.5%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.290, DataSource::CALCULATED);
    } else if (name == "Uranus") {
        d.mass_earth = MeasuredValue<double>(14.54, DataSource::CALCULATED);
        d.radius_earth = MeasuredValue<double>(4.01, DataSource::CALCULATED);
        d.density_gcc = MeasuredValue<double>(1.27, DataSource::CALCULATED);
        d.equilibrium_temp_k = MeasuredValue<double>(76.0, DataSource::CALCULATED);
        d.orbital_period_days = MeasuredValue<double>(30687.0, DataSource::CALCULATED);
        d.semi_major_axis_au = MeasuredValue<double>(19.19, DataSource::CALCULATED);
        d.eccentricity = MeasuredValue<double>(0.047, DataSource::CALCULATED);
        d.surface_gravity_g = MeasuredValue<double>(0.89, DataSource::CALCULATED);
        d.planet_type = MeasuredValue<std::string>("Ice Giant", DataSource::CALCULATED);
        d.atmosphere_composition = MeasuredValue<std::string>("H2 83%, He 15%, CH4 2.3%", DataSource::CALCULATED);
        d.albedo = MeasuredValue<double>(0.300, DataSource::CALCULATED);
    }
    return d;
}

Application::Application() { init(); }

Application::~Application() { shutdown(); }

void Application::init() {
  Logger::init();
  LOG_INFO("Pony Stark starting...");

  WindowConfig config;
  config.title = "Pony Stark - holographic exoplanet explorer";
  config.width = 1280;
  config.height = 720;
  config.vsync = true;
  m_window = std::make_unique<Window>(config);

  m_camera = std::make_unique<Camera>();
  m_camera->setTarget(glm::vec3(0.0f));
  m_camera->setPosition(glm::vec3(0.0f, 0.0f, 5.0f));

  m_window->setScrollCallback([this](double, double yoffset) {
    if (ImGui::GetCurrentContext() && ImGui::GetIO().WantCaptureMouse) return;
    float zoomSpeed = m_camera->getDistance() * 0.15f;
    m_camera->zoom(static_cast<float>(-yoffset) * zoomSpeed);
  });

  m_window->setResizeCallback([this](int width, int height) {
    m_renderer->resize(width, height);
    m_camera->setAspectRatio(static_cast<float>(width) /
                             static_cast<float>(height));
  });

  m_renderer = std::make_unique<Renderer>();
  m_renderer->init(m_window->getWidth(), m_window->getHeight());

  m_ui = std::make_unique<UIManager>();
  m_ui->init(m_window->getHandle());

  // Preset manager
  m_presetManager.setPresetsDirectory("configs");
  m_presetManager.scanPresets();
  if (m_presetManager.getAvailablePresets().empty()) {
    m_presetManager.generateBuiltInPresets();
  }

  // Exoplanet data aggregator
  AggregatorConfig aggConfig;
  aggConfig.query_nasa = true;
  aggConfig.query_exomast = true;
  aggConfig.query_exoplanet_eu = true;
  m_dataAggregator = std::make_unique<ExoplanetDataAggregator>(aggConfig);
  m_dataAggregator->preloadExoplanetEuCatalog();

  // AI inference engine
  m_inferenceEngine = std::make_unique<InferenceEngine>();
  if (m_inferenceEngine->isAvailable()) {
    LOG_INFO("AI inference available");
  }

  // Galaxy view setup
  m_galaxy = std::make_unique<GalaxyView>();
  m_galaxy->setExoplanetCallback(
      [this](const std::string& name) { loadPlanet(name); });
  m_galaxy->setFetchMetadataCallback([this](const std::string& name) {
    // Fetch metadata from NASA in background, then predict missing values
    m_galaxy->setFetchingMetadata(true);
    std::thread([this, name]() {
      try {
        auto result = m_dataAggregator->queryPlanetSync(name);
        ExoplanetData d = result.data;

        // Use predictor to fill ALL missing fields
        ExoplanetPredictor predictor;
        predictor.setInferenceEngine(m_inferenceEngine.get());
        d = predictor.fillAllMissing(std::move(d));

        // Calculate distance in light years from parsecs
        float distLY = 0.f;
        if (d.distance_ly.hasValue()) {
          distLY = static_cast<float>(d.distance_ly.value);
        } else if (d.host_star.distance_pc.hasValue()) {
          distLY = static_cast<float>(d.host_star.distance_pc.value * 3.26156);
        }

        // All values are now guaranteed to be valid (no NaN)
        m_galaxy->updatePlanetMetadata(
            name, d.host_star.name, distLY,
            static_cast<float>(d.radius_earth.value),
            static_cast<float>(d.mass_earth.value),
            static_cast<float>(d.equilibrium_temp_k.value),
            d.host_star.gaia_dr3_id);
        LOG_INFO(
            "Fetched and predicted metadata for {}: host={}, dist={:.1f}ly, "
            "radius={:.2f}R_E, mass={:.2f}M_E, temp={:.0f}K [sources: R={}, "
            "M={}, T={}]",
            name, d.host_star.name, distLY, d.radius_earth.value,
            d.mass_earth.value, d.equilibrium_temp_k.value,
            dataSourceToString(d.radius_earth.source),
            dataSourceToString(d.mass_earth.source),
            dataSourceToString(d.equilibrium_temp_k.source));
      } catch (const std::exception& e) {
        LOG_WARN("Failed to fetch metadata for {}: {}", name, e.what());
      }
      m_galaxy->setFetchingMetadata(false);
    }).detach();
  });

  // Load cached planets into galaxy view
  auto cachedPlanets = ExoplanetConverter::listCachedPlanets();
  for (const auto& planet : cachedPlanets) {
    m_galaxy->addExoplanet(planet.name, planet.type, 0.0f);
  }
  LOG_INFO("Added {} cached planets to galaxy view", cachedPlanets.size());

  // Initialize simulation and load solar system
  m_simulation.init();
  m_simulation.loadSolarSystem();
  m_simulation.setFocusBody("Earth");

  // Create blank cursor for mouse lock
  unsigned char pixels[4] = {0, 0, 0, 0};
  GLFWimage image = {1, 1, pixels};
  m_blankCursor = glfwCreateCursor(&image, 0, 0);

  // Gesture input (UDP from iPhone, port configurable via GESTURE_PORT env var)
  int gesturePort = 9001;
  if (const char* portEnv = std::getenv("GESTURE_PORT")) {
    gesturePort = std::atoi(portEnv);
    if (gesturePort <= 0 || gesturePort > 65535) gesturePort = 9001;
  }
  m_gestureInput = std::make_unique<GestureInput>(gesturePort);
  m_gestureInput->start();
  LOG_INFO("Gesture input on UDP port {}", gesturePort);

  // Hologram quad-view scale (configurable via HOLO_SCALE and HOLO_GAP env vars)
  if (const char* scaleEnv = std::getenv("HOLO_SCALE")) {
    m_holoScale = static_cast<float>(std::atof(scaleEnv));
    if (m_holoScale < 1.0f || m_holoScale > 20.0f) m_holoScale = 5.0f;
  }
  if (const char* gapEnv = std::getenv("HOLO_GAP")) {
    m_holoGap = static_cast<float>(std::atof(gapEnv));
    if (m_holoGap < 0.0f || m_holoGap > 1.0f) m_holoGap = 0.25f;
  }

  // Pass GPU-specific point size boost to renderers
  m_galaxy->setPointSizeBoost(m_window->getPointSizeBoost());

  m_lastFrameTime = m_window->getTime();
  LOG_INFO("Ready");
}

void Application::runIntro() {
  // Hide the planet during intro
  auto savedParams = m_renderer->params();
  m_renderer->params().radius = 0.001f;
  m_renderer->params().atmosphereDensity = 0.0f;
  m_renderer->params().cloudsDensity = 0.0f;

  IntroAnimation intro;
  bool borderSynced = false;
  m_lastFrameTime = m_window->getTime();

  while (!m_window->shouldClose() && !intro.isDone()) {
    double currentTime = m_window->getTime();
    float dt = static_cast<float>(currentTime - m_lastFrameTime);
    m_lastFrameTime = currentTime;
    dt = std::min(dt, 0.05f);

    m_window->pollEvents();

    // Skip on Escape or Space
    GLFWwindow* w = m_window->getHandle();
    if (glfwGetKey(w, GLFW_KEY_ESCAPE) == GLFW_PRESS ||
        glfwGetKey(w, GLFW_KEY_SPACE) == GLFW_PRESS)
      break;

    intro.update(dt);

    m_renderer->beginFrame();
    m_renderer->render(*m_camera);

    m_ui->beginFrame();
    ImGuiIO& io = ImGui::GetIO();

    // Fade in planet with UI
    float uiAlpha = intro.getUIAlpha();
    {
      auto& rp = m_renderer->params();
      rp.radius = savedParams.radius * uiAlpha;
      rp.atmosphereDensity = savedParams.atmosphereDensity * uiAlpha;
      rp.cloudsDensity = savedParams.cloudsDensity * uiAlpha;
    }
    if (uiAlpha > 0.f) {
      ImVec2 winPos, winSize;
      ImGui::PushStyleVar(ImGuiStyleVar_Alpha, uiAlpha);
      m_ui->render(m_renderer->params(), &winPos, &winSize);
      ImGui::PopStyleVar();

      if (!borderSynced) {
        intro.syncBorderToWindow(winPos.x, winPos.y, winSize.x, winSize.y);
        borderSynced = true;
      }
    }

    // Full-screen overlay for intro particles
    ImGui::SetNextWindowPos({0.f, 0.f});
    ImGui::SetNextWindowSize(io.DisplaySize);
    ImGui::SetNextWindowBgAlpha(0.f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, {0.f, 0.f});
    if (ImGui::Begin("##intro_overlay", nullptr,
                     ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                         ImGuiWindowFlags_NoScrollbar |
                         ImGuiWindowFlags_NoSavedSettings |
                         ImGuiWindowFlags_NoMouseInputs |
                         ImGuiWindowFlags_NoBringToFrontOnFocus)) {
      ImGui::PopStyleVar();
      intro.render(ImGui::GetWindowDrawList(), io.DisplaySize.x,
                   io.DisplaySize.y);
    } else {
      ImGui::PopStyleVar();
    }
    ImGui::End();

    m_ui->endFrame();
    m_renderer->endFrame();
    m_window->swapBuffers();
  }

  m_renderer->params() = savedParams;
  m_lastFrameTime = m_window->getTime();
}

void Application::run() {
  // Run intro animation
  runIntro();

  // Start in galaxy mode with planet hidden
  m_savedParams = m_renderer->params();
  m_renderer->params().radius = 0.001f;
  m_renderer->params().atmosphereDensity = 0.0f;
  m_renderer->params().cloudsDensity = 0.0f;
  m_screen = AppScreen::Galaxy;
  m_galaxyFadeTimer = 0.f;

  while (!m_window->shouldClose() && m_running) {
    double currentTime = m_window->getTime();
    float deltaTime =
        std::min(static_cast<float>(currentTime - m_lastFrameTime), 0.05f);
    m_lastFrameTime = currentTime;

    m_window->pollEvents();

    // Process input first (may toggle m_quadViewEnabled via F5)
    if (m_screen == AppScreen::Galaxy) {
      handleInput();
      handleGestureInput(deltaTime);
      if (m_galaxy && m_galaxy->isViewingPlanet()) {
        update(deltaTime);
      }
    } else if (m_screen == AppScreen::SolarSystem) {
      handleSolarSystemInput();
      handleGestureInput(deltaTime);
      m_simulation.update(deltaTime);
    } else {
      handleInput();
      handleGestureInput(deltaTime);
      update(deltaTime);
    }

    // Bind FBO AFTER input so toggle takes effect this frame
    bool holoThisFrame = m_quadViewEnabled;
    if (holoThisFrame) {
      int screenW = m_window->getWidth();
      int screenH = m_window->getHeight();
      int faceSize = static_cast<int>(std::min(screenW, screenH) / m_holoScale);
      initHoloFBO(faceSize, faceSize);
      glBindFramebuffer(GL_FRAMEBUFFER, m_holoFBO);
      glViewport(0, 0, faceSize, faceSize);
      m_renderer->resize(faceSize, faceSize);
      m_camera->setAspectRatio(1.0f);
    }

    // Render (each function handles FBO→screen transition internally before UI)
    if (m_screen == AppScreen::Galaxy) {
      renderGalaxy(deltaTime);
    } else if (m_screen == AppScreen::SolarSystem) {
      renderSolarSystem(deltaTime);
    } else {
      render(deltaTime);
    }

    m_window->swapBuffers();
  }
}

void Application::renderGalaxy(float dt) {
  // Note: Solar system can be accessed via the "Solar System Simulation" button
  // in the sidebar

  ImGuiIO& io = ImGui::GetIO();
  if (!m_galaxy->isInitialized())
    m_galaxy->init(io.DisplaySize.x, io.DisplaySize.y);

  m_galaxy->update(dt, io.DisplaySize.x, io.DisplaySize.y);

  // Check transition states
  bool isZoomingIn = m_galaxy->isZoomingToPlanet();
  bool isViewingPlanet = m_galaxy->isViewingPlanet();
  bool isZoomingOut = m_galaxy->isZoomingOut();
  float transProgress = m_galaxy->getTransitionProgress();

  m_renderer->beginFrame();

  // If zooming in or out, blend between galaxy and planet render
  if (isZoomingIn || isZoomingOut) {
    float rawProgress = isZoomingIn ? transProgress : (1.0f - transProgress);

    // For most of the transition, just show galaxy
    if (rawProgress < 0.92f) {
      // Pure galaxy view while zooming
      m_galaxy->renderBackground(nullptr, io.DisplaySize.x, io.DisplaySize.y);
    } else {
      // Final stretch (92-100%): crossfade from galaxy to planet
      float crossfade = (rawProgress - 0.92f) / 0.08f;  // 0 to 1 over final 8%

      if (crossfade < 0.5f) {
        // First half: galaxy fading out
        m_galaxy->renderBackground(nullptr, io.DisplaySize.x, io.DisplaySize.y);
      } else {
        // Second half: planet fading in
        m_renderer->render(*m_camera, false);
      }
    }
  } else if (isViewingPlanet) {
    // Just render the planet when fully arrived
    m_renderer->render(*m_camera, false);
  } else {
    // Normal galaxy view - render 3D galaxy
    m_galaxy->renderBackground(nullptr, io.DisplaySize.x, io.DisplaySize.y);
  }

  // If hologram mode: unbind FBO, blit 4-face diamond, restore full-res for UI
  if (m_quadViewEnabled && m_holoFBO) {
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    int sw = m_window->getWidth(), sh = m_window->getHeight();
    blitHologram();
    m_renderer->resize(sw, sh);
    m_camera->setAspectRatio(static_cast<float>(sw) / static_cast<float>(sh));
    glViewport(0, 0, sw, sh);
  }

  m_ui->beginFrame();

  // Fade-in timer
  m_galaxyFadeTimer += dt;
  const float kFadeDur = 1.5f;
  const float fadeAlpha = std::min(m_galaxyFadeTimer / kFadeDur, 1.f);

  bool switching = m_galaxy->isExplosionDone();

  // Show UI only when not in full planet view
  if (!switching && !isViewingPlanet) {
    m_galaxy->renderUI(io.DisplaySize.x, io.DisplaySize.y);
  }

  // When viewing planet, show full planet UI with controls
  if (isViewingPlanet) {
    // Render planet control panels
    m_ui->render(m_renderer->params());

    // Simulation controls for planet rotation
    auto simResult = m_ui->renderSimulationControls(
        m_renderer->isPaused(), static_cast<double>(m_renderer->timeScale()),
        false,  // No lock feature in single planet view
        "");
    if (simResult.pauseToggled) {
      m_renderer->setPaused(!m_renderer->isPaused());
    }
    if (simResult.timeScaleChanged) {
      m_renderer->setTimeScale(static_cast<float>(simResult.newTimeScale));
    }

    m_ui->renderThemeToggle();

    // Handle back button from the panel
    if (m_ui->wasBackPressed()) {
      m_camera->setDistanceLimits(0.1f, 1000.0f);
      m_galaxy->startZoomToGalaxy();
    }
  }

  // Theme toggle for non-planet views
  if (!switching && !isViewingPlanet) m_ui->renderThemeToggle();

  // Transition flash overlay (smooth the galaxy->planet switch)
  if (isZoomingIn || isZoomingOut) {
    float rawProgress = isZoomingIn ? transProgress : (1.0f - transProgress);
    // Create a brief white flash at the crossfade point (around 94-98%)
    if (rawProgress > 0.90f && rawProgress < 1.0f) {
      // Peak at 96%, fade in from 90%, fade out to 100%
      float flashIntensity;
      if (rawProgress < 0.96f) {
        flashIntensity = (rawProgress - 0.90f) / 0.06f;  // Fade in
      } else {
        flashIntensity = 1.0f - (rawProgress - 0.96f) / 0.04f;  // Fade out
      }
      flashIntensity = std::clamp(flashIntensity, 0.0f, 1.0f);
      int flashAlpha = static_cast<int>(flashIntensity *
                                        200);  // Max 200 alpha (not full white)
      ImGui::GetForegroundDrawList()->AddRectFilled(
          {0.f, 0.f}, io.DisplaySize, IM_COL32(255, 255, 255, flashAlpha));
    }
  }

  // Fade-in overlay
  if (fadeAlpha < 1.f) {
    int blackAlpha = static_cast<int>((1.f - fadeAlpha) * 255);
    ImGui::GetForegroundDrawList()->AddRectFilled(
        {0.f, 0.f}, io.DisplaySize, IM_COL32(0, 0, 0, blackAlpha));
  }

  renderGestureHUD();
  renderHelpOverlay();

  m_ui->endFrame();
  m_renderer->endFrame();

  // Check for solar system button click
  if (m_galaxy->wasSolarSystemRequested()) {
    m_simulation.loadSolarSystem();
    m_simulation.resume();
    m_camera->setPosition(glm::vec3(0.0f, 50.0f, 100.0f));
    m_camera->setTarget(glm::vec3(0.0f));
    m_screen = AppScreen::SolarSystem;
    LOG_INFO("Switching to Solar System simulation");
    return;
  }

  // Handle zoom transitions - load planet when zoom starts
  static bool wasZooming = false;
  if (isZoomingIn && !wasZooming) {
    // Just started zooming - load the planet so it's ready when we arrive
    const std::string name = m_galaxy->selectedName();
    const int preset = m_galaxy->selectedPreset();

    if (preset >= 0) {
      m_renderer->params() = UIManager::getPreset(preset);
      m_currentStatus = name + "  |  Preset";
      m_ui->setCurrentExoplanetData(makeSolarSystemData(name));
    } else {
      loadPlanet(name);
    }

    // Set up camera for planet viewing — distance scales with planet radius
    float r = m_renderer->params().radius;
    float viewDist = r * 3.0f;
    m_camera->setTarget(glm::vec3(0.0f));
    m_camera->setPosition(glm::vec3(0.0f, 0.0f, viewDist));
    m_camera->setDistanceLimits(r * 1.2f, r * 20.0f);
    m_renderer->setPlanetPosition(glm::vec3(0.0f));

    // Clear simulation state
    m_simulation.clear();
    m_renderer->clearRings();

    LOG_INFO("Loading planet for zoom transition: {}", name);
  }
  wasZooming = isZoomingIn;

  // When zoom out completes, we're back in galaxy browsing mode
  // (nothing special needed - just continue rendering galaxy)

  if (switching) {
    const std::string name = m_galaxy->selectedName();
    const int preset = m_galaxy->selectedPreset();

    if (preset >= 0) {
      m_renderer->params() = UIManager::getPreset(preset);
      m_currentStatus = name + "  |  Preset";
      m_ui->setExoplanetStatus(m_currentStatus);
      m_ui->setCurrentExoplanetData(makeSolarSystemData(name));
      LOG_INFO("Galaxy expand (preset): {}", name);
    } else {
      m_renderer->params() = m_savedParams;
      loadPlanet(name);
    }

    m_borderFadeTimer = 0.f;
    m_borderReleased = false;
    m_planetDetailFadeIn = 0.f;

    // Reset camera to default planet viewing position — distance scales with planet radius
    float r = m_renderer->params().radius;
    float viewDist = r * 3.0f;
    m_camera->setTarget(glm::vec3(0.0f));
    m_camera->setPosition(glm::vec3(0.0f, 0.0f, viewDist));
    m_camera->setDistanceLimits(r * 1.2f, r * 20.0f);
    m_renderer->setPlanetPosition(glm::vec3(0.0f));
    m_mouseLocked = false;
    glfwSetInputMode(m_window->getHandle(), GLFW_CURSOR, GLFW_CURSOR_NORMAL);

    // Clear simulation state from solar system mode
    m_simulation.clear();
    m_renderer->clearRings();

    m_screen = AppScreen::PlanetDetail;
    LOG_INFO("Switching to PlanetDetail for: {}", name);
  }
}

void Application::handleSolarSystemInput() {
  GLFWwindow* window = m_window->getHandle();

  // Tab - toggle mouse lock
  static bool tabWasPressed = false;
  bool tabPressed = glfwGetKey(window, GLFW_KEY_TAB) == GLFW_PRESS;
  if (tabPressed && !tabWasPressed) {
    m_mouseLocked = !m_mouseLocked;
    if (m_mouseLocked) {
      glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
      if (glfwRawMouseMotionSupported()) {
        glfwSetInputMode(window, GLFW_RAW_MOUSE_MOTION, GLFW_TRUE);
      }
      glfwGetCursorPos(window, &m_lastMouseX, &m_lastMouseY);
    } else {
      glfwSetInputMode(window, GLFW_RAW_MOUSE_MOTION, GLFW_FALSE);
      glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_NORMAL);
    }
  }
  tabWasPressed = tabPressed;

  // FPS mouse look
  if (m_mouseLocked) {
    double x, y;
    glfwGetCursorPos(window, &x, &y);
    float dx = static_cast<float>(x - m_lastMouseX);
    float dy = static_cast<float>(y - m_lastMouseY);
    m_lastMouseX = x;
    m_lastMouseY = y;
    m_camera->rotate(-dx * 0.003f, dy * 0.003f);
  }

  // Skip other input if ImGui wants keyboard
  if (ImGui::GetIO().WantCaptureKeyboard && !m_mouseLocked) return;

  // WASD/QE movement
  float moveSpeed = m_cameraSpeed * 0.016f;
  if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS) moveSpeed *= 5.0f;
  if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)
    m_camera->moveForward(moveSpeed);
  if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)
    m_camera->moveForward(-moveSpeed);
  if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)
    m_camera->moveRight(-moveSpeed);
  if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)
    m_camera->moveRight(moveSpeed);
  if (glfwGetKey(window, GLFW_KEY_Q) == GLFW_PRESS)
    m_camera->moveUp(-moveSpeed);
  if (glfwGetKey(window, GLFW_KEY_E) == GLFW_PRESS) m_camera->moveUp(moveSpeed);

  // Space - toggle pause
  static bool spaceWasPressed = false;
  bool spacePressed = glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS;
  if (spacePressed && !spaceWasPressed) {
    m_simulation.togglePause();
  }
  spaceWasPressed = spacePressed;

  // +/= increase time scale
  static bool plusWasPressed = false;
  bool plusPressed = glfwGetKey(window, GLFW_KEY_EQUAL) == GLFW_PRESS;
  if (plusPressed && !plusWasPressed) {
    m_simulation.setTimeScale(m_simulation.timeScale() * 2.0);
  }
  plusWasPressed = plusPressed;

  // - decrease time scale
  static bool minusWasPressed = false;
  bool minusPressed = glfwGetKey(window, GLFW_KEY_MINUS) == GLFW_PRESS;
  if (minusPressed && !minusWasPressed) {
    m_simulation.setTimeScale(m_simulation.timeScale() * 0.5);
  }
  minusWasPressed = minusPressed;

  // 1-5 focus on bodies
  static int lastKey = 0;
  int key = 0;
  if (glfwGetKey(window, GLFW_KEY_1) == GLFW_PRESS)
    key = 1;
  else if (glfwGetKey(window, GLFW_KEY_2) == GLFW_PRESS)
    key = 2;
  else if (glfwGetKey(window, GLFW_KEY_3) == GLFW_PRESS)
    key = 3;
  else if (glfwGetKey(window, GLFW_KEY_4) == GLFW_PRESS)
    key = 4;
  else if (glfwGetKey(window, GLFW_KEY_5) == GLFW_PRESS)
    key = 5;

  if (key != 0 && key != lastKey) {
    const char* names[] = {"", "Sun", "Earth", "Mars", "Jupiter", "Moon"};
    if (key <= 5) {
      m_simulation.setFocusBody(names[key]);
      auto* focus = m_simulation.focusBody();
      if (focus) {
        if (m_simulation.hasAppearance(focus->id())) {
          m_renderer->params() = m_simulation.getBodyAppearance(focus->id());
        }
        float viewDistance = focus->renderRadius() * 4.0f;
        m_camera->transitionTo(glm::vec3(0.0f), 1.5f, viewDistance);
      }
    }
  }
  lastKey = key;

  // Escape - back to galaxy
  if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
    m_screen = AppScreen::Galaxy;
    m_galaxyFadeTimer = 0.f;
  }
}

void Application::renderSolarSystem(float dt) {
  m_camera->update(dt);

  m_renderer->beginFrame();

  // Render starfield background
  m_renderer->renderStarfield(*m_camera);

  // Get focus position for coordinate conversion
  glm::dvec3 focusPos = m_simulation.focusBody()
                            ? m_simulation.focusBody()->position()
                            : glm::dvec3(0.0);

  // Render all bodies
  for (const auto& body : m_simulation.world().bodies()) {
    // Convert physics position to render position (relative to focus)
    glm::dvec3 relPos = body->position() - focusPos;
    glm::vec3 renderPos = m_simulation.physicsToRender(relPos);

    // Set planet position for rendering
    m_renderer->setPlanetPosition(renderPos);

    // Get appearance params for this body (always set to avoid stale params)
    m_renderer->params() = m_simulation.getBodyAppearance(body->id());

    // Render the body
    m_renderer->render(*m_camera, body->isEmissive());

    // Render ring if present
    if (m_renderer->hasRing(body->id())) {
      m_renderer->renderRing(body->id(), *m_camera, renderPos);
    }
  }

  // Render orbit trails
  m_simulation.renderOrbits(*m_renderer, *m_camera);

  m_renderer->updateRings(dt);

  // If hologram mode: unbind FBO, blit 4-face diamond, restore full-res for UI
  if (m_quadViewEnabled && m_holoFBO) {
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    int sw = m_window->getWidth(), sh = m_window->getHeight();
    blitHologram();
    m_renderer->resize(sw, sh);
    m_camera->setAspectRatio(static_cast<float>(sw) / static_cast<float>(sh));
    glViewport(0, 0, sw, sh);
  }

  // UI
  m_ui->beginFrame();

  // Left sidebar with body list
  ImGui::SetNextWindowPos(ImVec2(10, 10));
  ImGui::SetNextWindowSize(ImVec2(200, 400));
  ImGui::SetNextWindowBgAlpha(0.85f);
  if (ImGui::Begin("##solar_sidebar", nullptr,
                   ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                       ImGuiWindowFlags_NoSavedSettings)) {
    ImGui::Text("Solar System");
    ImGui::Separator();

    auto stats = m_simulation.getStats();
    ImGui::TextDisabled("Time: %.1f days", stats.simulationTime / 86400.0);
    ImGui::TextDisabled("Speed: %.0fx", stats.timeScale);
    ImGui::Text(stats.paused ? "PAUSED" : "Running");
    ImGui::Separator();

    // Clickable body list
    ImGui::TextDisabled("Bodies");
    if (ImGui::BeginChild("##bodylist", ImVec2(-1, 200), true)) {
      for (const auto& body : m_simulation.world().bodies()) {
        bool isFocused = (m_simulation.focusBody() == body.get());
        if (ImGui::Selectable(body->name().c_str(), isFocused)) {
          m_simulation.setFocusBody(body->id());
          if (m_simulation.hasAppearance(body->id())) {
            m_renderer->params() = m_simulation.getBodyAppearance(body->id());
          }
          float viewDist = body->renderRadius() * 4.0f;
          m_camera->transitionTo(glm::vec3(0.0f), 1.0f, viewDist);
        }
      }
    }
    ImGui::EndChild();

    ImGui::Separator();
    ImGui::TextDisabled("Controls");
    ImGui::TextDisabled("WASD/QE: Move");
    ImGui::TextDisabled("Tab: Mouse lock");
    ImGui::TextDisabled("Space: Pause");
    ImGui::TextDisabled("+/-: Speed");

    ImGui::Spacing();
    if (ImGui::Button("Back to Galaxy", ImVec2(-1, 0))) {
      m_camera->setDistanceLimits(0.1f, 1000.0f);
      m_screen = AppScreen::Galaxy;
      m_galaxyFadeTimer = 0.f;
    }
  }
  ImGui::End();

  m_ui->renderThemeToggle();
  m_ui->endFrame();

  m_renderer->endFrame();
}

void Application::loadPlanet(const std::string& name) {
  if (m_planetLoading) return;
  LOG_INFO("Loading planet: {}", name);

  // First check if it's cached
  auto cachedParams = ExoplanetConverter::loadCachedParams(name);
  LOG_INFO("loadPlanet: cache lookup for '{}': {}", name, cachedParams.has_value() ? "HIT" : "MISS");
  if (cachedParams) {
    m_renderer->params() = *cachedParams;
    m_currentStatus = name;
    m_ui->setExoplanetStatus(m_currentStatus);
    LOG_INFO("Loaded cached params for {}", name);

    // Also fetch metadata in background for DATA tab
    std::thread([this, name]() {
      try {
        auto result = m_dataAggregator->queryPlanetSync(name);
        // Fill ALL missing fields with predictions
        ExoplanetPredictor predictor;
        predictor.setInferenceEngine(m_inferenceEngine.get());
        auto filledData = predictor.fillAllMissing(std::move(result.data));
        m_ui->setCurrentExoplanetData(filledData);
      } catch (...) {
        // Ignore - metadata is optional
      }
    }).detach();
    return;
  }

  // Otherwise, start async load
  m_planetLoading = true;
  m_ui->setExoplanetStatus("Searching...");
  m_ui->clearCurrentExoplanetData();

  m_planetFuture = std::async(std::launch::async, [this, name]() -> LoadResult {
    LoadResult result;
    result.hasExoData = false;

    LOG_INFO("loadPlanet async: querying all sources for '{}'", name);

    auto aggResult = m_dataAggregator->queryPlanetSync(name);
    auto data = std::move(aggResult.data);

    if (data.name.empty() || (!data.mass_earth.hasValue() && !data.radius_earth.hasValue()
        && !data.equilibrium_temp_k.hasValue() && data.host_star.name.empty())) {
      LOG_WARN("loadPlanet: no meaningful data returned for '{}'", name);
      result.status = "Not found: \"" + name + "\"";
      return result;
    }
    LOG_INFO("loadPlanet: aggregated data for '{}' (NASA={}, EU={}, ExoMAST={})",
             name, aggResult.sources.nasa_tap, aggResult.sources.exoplanet_eu,
             aggResult.sources.exomast);

    // Fill ALL missing fields with scientific predictions + AI
    ExoplanetPredictor predictor;
    predictor.setInferenceEngine(m_inferenceEngine.get());
    data = predictor.fillAllMissing(std::move(data));

    // Convert to render params
    PlanetParams params =
        ExoplanetConverter::toPlanetParams(data, m_inferenceEngine.get());

    result.params = params;
    result.status = data.name;
    result.exoData = data;
    result.hasExoData = true;
    return result;
  });
}

void Application::handleInput() {
  GLFWwindow* window = m_window->getHandle();
  ImGuiIO& io = ImGui::GetIO();

  // Left-click drag to orbit around planet (always active, independent of keyboard)
  static bool dragging = false;
  static double dragLastX = 0, dragLastY = 0;

  bool viewingPlanet =
      m_screen == AppScreen::PlanetDetail ||
      (m_screen == AppScreen::Galaxy && m_galaxy && m_galaxy->isViewingPlanet());

  if (viewingPlanet && !io.WantCaptureMouse) {
    bool lmbDown = glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_LEFT) == GLFW_PRESS;
    if (lmbDown) {
      double mx, my;
      glfwGetCursorPos(window, &mx, &my);
      if (!dragging) {
        dragging = true;
        dragLastX = mx;
        dragLastY = my;
      } else {
        float dx = static_cast<float>(mx - dragLastX);
        float dy = static_cast<float>(my - dragLastY);
        dragLastX = mx;
        dragLastY = my;
        m_camera->rotate(-dx * 0.005f, dy * 0.005f);
      }
    } else {
      dragging = false;
    }
  } else {
    dragging = false;
  }

  // Tab toggle mouse lock (FPS mode)
  static bool tabWasPressed = false;
  bool tabPressed = glfwGetKey(window, GLFW_KEY_TAB) == GLFW_PRESS;
  if (tabPressed && !tabWasPressed) {
    m_mouseLocked = !m_mouseLocked;
    if (m_mouseLocked) {
      glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
      if (glfwRawMouseMotionSupported()) {
        glfwSetInputMode(window, GLFW_RAW_MOUSE_MOTION, GLFW_TRUE);
      }
      glfwGetCursorPos(window, &m_lastMouseX, &m_lastMouseY);
    } else {
      glfwSetInputMode(window, GLFW_RAW_MOUSE_MOTION, GLFW_FALSE);
      glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_NORMAL);
    }
  }
  tabWasPressed = tabPressed;

  if ((io.WantCaptureKeyboard || ImGui::IsAnyItemActive()) && !m_mouseLocked) return;

  // F1 toggle help overlay
  static bool f1WasPressed = false;
  bool f1Pressed = glfwGetKey(window, GLFW_KEY_F1) == GLFW_PRESS;
  if (f1Pressed && !f1WasPressed) {
    m_showHelp = !m_showHelp;
  }
  f1WasPressed = f1Pressed;

  // F5 toggle quad-view (Pepper's Ghost hologram mode)
  static bool f5WasPressed = false;
  bool f5Pressed = glfwGetKey(window, GLFW_KEY_F5) == GLFW_PRESS;
  if (f5Pressed && !f5WasPressed) {
    m_quadViewEnabled = !m_quadViewEnabled;
    m_renderer->setQuadView(m_quadViewEnabled);
    LOG_INFO("Quad-view (hologram mode): {}", m_quadViewEnabled ? "ON" : "OFF");
  }
  f5WasPressed = f5Pressed;

  // Camera speed
  static bool bracketLeftWasPressed = false;
  bool bracketLeftPressed =
      glfwGetKey(window, GLFW_KEY_LEFT_BRACKET) == GLFW_PRESS;
  if (bracketLeftPressed && !bracketLeftWasPressed) {
    m_cameraSpeed = std::max(1.0f, m_cameraSpeed / 2.0f);
  }
  bracketLeftWasPressed = bracketLeftPressed;

  static bool bracketRightWasPressed = false;
  bool bracketRightPressed =
      glfwGetKey(window, GLFW_KEY_RIGHT_BRACKET) == GLFW_PRESS;
  if (bracketRightPressed && !bracketRightWasPressed) {
    m_cameraSpeed = std::min(100000.0f, m_cameraSpeed * 2.0f);
  }
  bracketRightWasPressed = bracketRightPressed;

  // WASD movement — disabled in hologram mode when viewing a planet (orbit only)
  bool planetLocked = m_quadViewEnabled && viewingPlanet;
  if (!planetLocked) {
    float moveSpeed = m_cameraSpeed;
    float deltaTime = 0.016f;
    if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS) {
      moveSpeed *= 5.0f;
    }
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) {
      m_camera->moveForward(moveSpeed * deltaTime);
    }
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) {
      m_camera->moveForward(-moveSpeed * deltaTime);
    }
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) {
      m_camera->moveRight(-moveSpeed * deltaTime);
    }
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) {
      m_camera->moveRight(moveSpeed * deltaTime);
    }
  }
}

void Application::update(float deltaTime) {
  // Update simulation physics
  m_simulation.update(deltaTime);

  // Handle gesture input (additive, doesn't interfere with keyboard/mouse)
  handleGestureInput(deltaTime);

  // FPS mouse look
  if (m_mouseLocked) {
    double x, y;
    m_window->getCursorPos(x, y);
    float dx = static_cast<float>(x - m_lastMouseX);
    float dy = static_cast<float>(y - m_lastMouseY);
    m_lastMouseX = x;
    m_lastMouseY = y;
    m_camera->rotate(-dx * 0.003f, dy * 0.003f);
  }

  m_camera->update(deltaTime);

  // Check async planet load
  if (m_planetLoading && m_planetFuture.valid()) {
    if (m_planetFuture.wait_for(std::chrono::milliseconds(0)) ==
        std::future_status::ready) {
      auto result = m_planetFuture.get();
      if (result.params.has_value()) {
        m_renderer->params() = *result.params;
      }
      m_currentStatus = result.status;
      m_ui->setExoplanetStatus(m_currentStatus);
      if (result.hasExoData) {
        m_ui->setCurrentExoplanetData(result.exoData);
      }
      m_planetLoading = false;
      LOG_INFO("Planet loaded: {}", m_currentStatus);
    }
  }
}

void Application::render(float dt) {
  m_renderer->beginFrame();
  m_renderer->render(*m_camera);

  // If hologram mode: unbind FBO, blit 4-face diamond, restore full-res for UI
  if (m_quadViewEnabled && m_holoFBO) {
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    int sw = m_window->getWidth(), sh = m_window->getHeight();
    blitHologram();
    m_renderer->resize(sw, sh);
    m_camera->setAspectRatio(static_cast<float>(sw) / static_cast<float>(sh));
    glViewport(0, 0, sw, sh);
  }

  m_ui->beginFrame();

  ImGuiIO& io = ImGui::GetIO();

  // Border overlay during transition
  if (m_borderFadeTimer >= 0.f) {
    m_borderFadeTimer += dt;
    m_galaxy->update(dt, io.DisplaySize.x, io.DisplaySize.y);

    ImGui::SetNextWindowPos({0.f, 0.f});
    ImGui::SetNextWindowSize(io.DisplaySize);
    ImGui::SetNextWindowBgAlpha(0.f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, {0.f, 0.f});
    if (ImGui::Begin("##border_overlay", nullptr,
                     ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                         ImGuiWindowFlags_NoSavedSettings |
                         ImGuiWindowFlags_NoMouseInputs |
                         ImGuiWindowFlags_NoBringToFrontOnFocus)) {
      ImGui::PopStyleVar();
      m_galaxy->renderBackground(ImGui::GetWindowDrawList(), io.DisplaySize.x,
                                 io.DisplaySize.y);
    } else {
      ImGui::PopStyleVar();
    }
    ImGui::End();

    if (m_borderFadeTimer > 0.50f && !m_borderReleased) {
      m_galaxy->releaseBorder();
      m_borderReleased = true;
    }
    if (m_borderFadeTimer > 0.85f) {
      m_galaxy->reset();
      m_borderFadeTimer = -1.f;
      m_borderReleased = false;
    }
  }

  // Planet detail UI with fade-in
  if (m_planetDetailFadeIn < 1.f)
    m_planetDetailFadeIn = std::min(m_planetDetailFadeIn + dt / 0.5f, 1.f);

  if (m_planetDetailFadeIn < 1.f) {
    ImGui::PushStyleVar(ImGuiStyleVar_Alpha, m_planetDetailFadeIn);
    m_ui->render(m_renderer->params());
    ImGui::PopStyleVar();
  } else {
    m_ui->render(m_renderer->params());
  }

  m_ui->renderThemeToggle();

  // Simulation controls (controls planet rotation animation)
  auto simResult = m_ui->renderSimulationControls(
      m_renderer->isPaused(), static_cast<double>(m_renderer->timeScale()),
      false,  // No lock feature in single planet view
      "");

  if (simResult.pauseToggled) {
    m_renderer->setPaused(!m_renderer->isPaused());
  }
  if (simResult.timeScaleChanged) {
    m_renderer->setTimeScale(static_cast<float>(simResult.newTimeScale));
  }

  renderGestureHUD();
  renderHelpOverlay();

  m_ui->endFrame();
  m_renderer->endFrame();

  // Back button returns to galaxy
  if (m_ui->wasBackPressed()) {
    m_savedParams = m_renderer->params();
    m_renderer->params().radius = 0.001f;
    m_renderer->params().atmosphereDensity = 0.0f;
    m_renderer->params().cloudsDensity = 0.0f;
    m_galaxy->reset();
    m_borderFadeTimer = -1.f;
    m_borderReleased = false;
    m_planetDetailFadeIn = 1.f;
    m_camera->setDistanceLimits(0.1f, 1000.0f);
    m_screen = AppScreen::Galaxy;
    LOG_INFO("Back to Galaxy screen");
  }
}

void Application::handleGestureInput(float dt) {
  if (!m_gestureInput || !m_gestureInput->isConnected()) return;

  auto state = m_gestureInput->getState();
  if (state.gesture == "none") return;

  bool viewingPlanet =
      m_screen == AppScreen::PlanetDetail ||
      (m_screen == AppScreen::Galaxy && m_galaxy && m_galaxy->isViewingPlanet());

  bool inGalaxyNav =
      m_screen == AppScreen::Galaxy && !viewingPlanet;

  if (viewingPlanet || m_screen == AppScreen::SolarSystem) {
    // Orbit camera gestures
    const float rotateSpeed = 3.0f;
    float zoomSpeed = m_camera->getDistance() * 2.0f;

    if (state.gesture == "pinch") {
      float dx = (state.palmX - 0.5f) * rotateSpeed * dt;
      float dy = (state.palmY - 0.5f) * rotateSpeed * dt;
      m_camera->rotate(dx, dy);
    } else if (state.gesture == "open_palm") {
      float zoomDelta = (state.palmZ - 1.0f) * zoomSpeed * dt;
      m_camera->zoom(zoomDelta);
    } else if (state.gesture == "point") {
      float dx = (state.palmX - 0.5f) * 1.0f * dt;
      float dy = (state.palmY - 0.5f) * 1.0f * dt;
      m_camera->rotate(dx, dy);
    }
  } else if (inGalaxyNav) {
    // Galaxy free-fly camera gestures
    auto* cam = m_galaxy ? m_galaxy->getFreeCamera() : nullptr;
    if (!cam) return;

    if (state.gesture == "pinch") {
      float dx = (state.palmX - 0.5f) * 80.0f * dt;
      float dy = -(state.palmY - 0.5f) * 80.0f * dt;
      cam->processMouseMovement(dx, dy);
    } else if (state.gesture == "fist") {
      cam->processKeyboard(true, false, false, false, false, false, dt);
    } else if (state.gesture == "open_palm") {
      float speed = (state.palmZ - 1.0f) * 3.0f;
      if (std::abs(speed) > 0.1f) {
        cam->processKeyboard(speed > 0, speed < 0, false, false, false, false, dt);
      }
    } else if (state.gesture == "point") {
      float dx = (state.palmX - 0.5f) * 40.0f * dt;
      float dy = -(state.palmY - 0.5f) * 40.0f * dt;
      cam->processMouseMovement(dx, dy);
    }
  }
}

void Application::renderGestureHUD() {
  ImGuiIO& io = ImGui::GetIO();
  bool gestureConnected = m_gestureInput && m_gestureInput->isConnected();

  float hudW = 220.0f;
  float hudH = gestureConnected ? 100.0f : 30.0f;
  ImGui::SetNextWindowPos(ImVec2(io.DisplaySize.x - hudW - 10, 10));
  ImGui::SetNextWindowSize(ImVec2(hudW, hudH));
  ImGui::SetNextWindowBgAlpha(0.75f);
  if (ImGui::Begin("##gesture_hud", nullptr,
                   ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                       ImGuiWindowFlags_NoSavedSettings |
                       ImGuiWindowFlags_NoFocusOnAppearing |
                       ImGuiWindowFlags_NoNav)) {
    if (!gestureConnected) {
      ImGui::TextColored(ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "Gesture: waiting (UDP %d)",
                         m_gestureInput ? m_gestureInput->getPort() : 9001);
    } else {
      auto gs = m_gestureInput->getState();
      ImVec4 col = {0.3f, 1.0f, 0.3f, 1.0f};
      if (gs.gesture == "none") col = {0.6f, 0.6f, 0.6f, 1.0f};

      ImGui::TextColored(col, "%s", gs.gesture.c_str());
      ImGui::SameLine();
      ImGui::TextColored(ImVec4(0.7f, 0.7f, 0.7f, 1.0f), "(%s %.0f%%)",
                         gs.hand.c_str(), gs.confidence * 100.0f);
      ImGui::TextColored(ImVec4(0.5f, 0.8f, 1.0f, 1.0f),
                         "Palm: %.2f, %.2f, %.2fm", gs.palmX, gs.palmY, gs.palmZ);
      ImGui::TextColored(ImVec4(0.8f, 0.8f, 0.5f, 1.0f),
                         "Fingers: %d  |  %s",
                         gs.fingersExtended,
                         m_quadViewEnabled ? "HOLO" : "normal");
    }
  }
  ImGui::End();

  // Live finger skeleton overlay (full-screen, transparent)
  if (gestureConnected) {
    auto gs = m_gestureInput->getState();
    if (gs.hasTips && gs.gesture != "none") {
      ImDrawList* dl = ImGui::GetForegroundDrawList();
      float W = io.DisplaySize.x;
      float H = io.DisplaySize.y;

      // Vision coords: origin bottom-left, x right, y up — flip Y for screen
      auto toScreen = [W, H](float vx, float vy) -> ImVec2 {
        return ImVec2(vx * W, (1.0f - vy) * H);
      };

      ImVec2 wristP  = toScreen(gs.wrist.x,  gs.wrist.y);
      ImVec2 thumbP  = toScreen(gs.thumb.x,  gs.thumb.y);
      ImVec2 indexP  = toScreen(gs.index.x,  gs.index.y);
      ImVec2 middleP = toScreen(gs.middle.x, gs.middle.y);
      ImVec2 ringP   = toScreen(gs.ring.x,   gs.ring.y);
      ImVec2 littleP = toScreen(gs.little.x, gs.little.y);
      ImVec2 palmP   = toScreen(gs.palmX,    gs.palmY);

      ImU32 boneCol  = IM_COL32(100, 200, 255, 160);
      ImU32 jointCol = IM_COL32(255, 255, 255, 220);
      ImU32 tipCol   = IM_COL32(0, 255, 120, 255);
      ImU32 palmCol  = IM_COL32(255, 200, 50, 180);

      // Bone lines: wrist → palm → each finger tip
      float thickness = 2.5f;
      dl->AddLine(wristP, palmP,   boneCol, thickness);
      dl->AddLine(palmP,  thumbP,  boneCol, thickness);
      dl->AddLine(palmP,  indexP,  boneCol, thickness);
      dl->AddLine(palmP,  middleP, boneCol, thickness);
      dl->AddLine(palmP,  ringP,   boneCol, thickness);
      dl->AddLine(palmP,  littleP, boneCol, thickness);

      // Joints at wrist and palm
      dl->AddCircleFilled(wristP, 6.0f, jointCol);
      dl->AddCircleFilled(palmP,  7.0f, palmCol);

      // Finger tips with glow
      ImVec2 tipPts[] = {thumbP, indexP, middleP, ringP, littleP};
      const char* tipNames[] = {"T", "I", "M", "R", "L"};
      for (int i = 0; i < 5; i++) {
        dl->AddCircleFilled(tipPts[i], 10.0f, IM_COL32(0, 255, 120, 40));
        dl->AddCircleFilled(tipPts[i], 5.0f,  tipCol);
        dl->AddText(ImVec2(tipPts[i].x + 8, tipPts[i].y - 6),
                    IM_COL32(200, 200, 200, 180), tipNames[i]);
      }

      // Gesture label at palm
      dl->AddText(ImVec2(palmP.x + 12, palmP.y - 8), palmCol, gs.gesture.c_str());
    }
  }
}

void Application::renderHelpOverlay() {
  if (!m_showHelp) return;

  ImGuiIO& io = ImGui::GetIO();
  float w = 340.0f, h = 320.0f;
  ImGui::SetNextWindowPos(ImVec2((io.DisplaySize.x - w) / 2,
                                 (io.DisplaySize.y - h) / 2));
  ImGui::SetNextWindowSize(ImVec2(w, h));
  ImGui::SetNextWindowBgAlpha(0.92f);
  if (ImGui::Begin("Keyboard Shortcuts", &m_showHelp,
                   ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoCollapse |
                       ImGuiWindowFlags_NoSavedSettings)) {
    ImGui::TextColored(ImVec4(1, 0.8f, 0.3f, 1), "Navigation");
    ImGui::BulletText("WASD       Move camera");
    ImGui::BulletText("Q / E      Move down / up");
    ImGui::BulletText("Shift      Sprint (5x speed)");
    ImGui::BulletText("Tab        Toggle mouse lock");
    ImGui::BulletText("[ / ]      Camera speed -/+");
    ImGui::BulletText("Scroll     Zoom in/out");
    ImGui::Separator();
    ImGui::TextColored(ImVec4(1, 0.8f, 0.3f, 1), "Modes");
    ImGui::BulletText("F1         This help");
    ImGui::BulletText("F5         Hologram quad-view");
    ImGui::BulletText("Escape     Back / exit");
    ImGui::BulletText("Space      Pause simulation");
    ImGui::BulletText("+ / -      Time scale");
    ImGui::Separator();
    ImGui::TextColored(ImVec4(1, 0.8f, 0.3f, 1), "Solar System");
    ImGui::BulletText("1-5        Focus body");
    ImGui::Separator();
    ImGui::TextColored(ImVec4(0.5f, 0.8f, 1.0f, 1), "Gestures (iPhone)");
    ImGui::BulletText("Open Palm  Zoom (depth)");
    ImGui::BulletText("Pinch      Rotate");
    ImGui::BulletText("Point      Precision rotate");
    ImGui::BulletText("Fist       Move forward");
  }
  ImGui::End();
}

void Application::initHoloFBO(int w, int h) {
  if (m_holoFBO && m_holoTexW == w && m_holoTexH == h) return;

  if (m_holoFBO) {
    glDeleteFramebuffers(1, &m_holoFBO);
    glDeleteTextures(1, &m_holoTex);
    glDeleteRenderbuffers(1, &m_holoDepthRBO);
  }

  glGenFramebuffers(1, &m_holoFBO);
  glBindFramebuffer(GL_FRAMEBUFFER, m_holoFBO);

  glGenTextures(1, &m_holoTex);
  glBindTexture(GL_TEXTURE_2D, m_holoTex);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, m_holoTex, 0);

  glGenRenderbuffers(1, &m_holoDepthRBO);
  glBindRenderbuffer(GL_RENDERBUFFER, m_holoDepthRBO);
  glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, w, h);
  glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, m_holoDepthRBO);

  GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
  if (status != GL_FRAMEBUFFER_COMPLETE) {
    LOG_ERROR("Hologram FBO incomplete: 0x{:X}", status);
  }

  glBindFramebuffer(GL_FRAMEBUFFER, 0);
  m_holoTexW = w;
  m_holoTexH = h;

  initHoloShader();
}

void Application::initHoloShader() {
  if (m_holoShader) return;

  const char* vertSrc = R"(
#version 410 core
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUV;
out vec2 vUV;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
    vUV = aUV;
}
)";

  const char* fragSrc = R"(
#version 410 core
in vec2 vUV;
out vec4 FragColor;
uniform sampler2D uTexture;
void main() {
    FragColor = texture(uTexture, vUV);
}
)";

  GLuint vs = glCreateShader(GL_VERTEX_SHADER);
  glShaderSource(vs, 1, &vertSrc, nullptr);
  glCompileShader(vs);

  GLuint fs = glCreateShader(GL_FRAGMENT_SHADER);
  glShaderSource(fs, 1, &fragSrc, nullptr);
  glCompileShader(fs);

  m_holoShader = glCreateProgram();
  glAttachShader(m_holoShader, vs);
  glAttachShader(m_holoShader, fs);
  glLinkProgram(m_holoShader);
  glDeleteShader(vs);
  glDeleteShader(fs);

  // Fullscreen quad: position (x,y) + uv (u,v) — will be overwritten per-face
  float quad[] = {
    -1, -1,  0, 0,
     1, -1,  1, 0,
     1,  1,  1, 1,
    -1, -1,  0, 0,
     1,  1,  1, 1,
    -1,  1,  0, 1,
  };

  glGenVertexArrays(1, &m_holoQuadVAO);
  glGenBuffers(1, &m_holoQuadVBO);
  glBindVertexArray(m_holoQuadVAO);
  glBindBuffer(GL_ARRAY_BUFFER, m_holoQuadVBO);
  glBufferData(GL_ARRAY_BUFFER, sizeof(quad), quad, GL_DYNAMIC_DRAW);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)0);
  glEnableVertexAttribArray(1);
  glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 4 * sizeof(float), (void*)(2 * sizeof(float)));
  glBindVertexArray(0);
}

void Application::blitHologram() {
  int w = m_window->getWidth();
  int h = m_window->getHeight();
  float baseSize = std::min((float)w, (float)h) / m_holoScale;
  float cx = w * 0.5f;
  float cy = h * 0.5f;
  float gap = baseSize * m_holoGap;

  // Pepper's Ghost diamond layout with UV flipping.
  // Each face: pixel rect (x,y,size) + UV corners for the flip.
  //   Bottom: original (UV normal)
  //   Top: flip both X+Y (180°)
  //   Left: flip X only
  //   Right: flip Y only
  struct Face {
    float px, py;
    float u0, v0, u1, v1;
  };

  Face faces[] = {
    { cx - baseSize * 0.5f, cy - baseSize * 1.5f - gap,   0, 0, 1, 1 },  // Bottom: normal
    { cx - baseSize * 0.5f, cy + baseSize * 0.5f + gap,   1, 1, 0, 0 },  // Top: flip X+Y
    { cx - baseSize * 1.5f - gap, cy - baseSize * 0.5f,   1, 0, 0, 1 },  // Left: flip X
    { cx + baseSize * 0.5f + gap, cy - baseSize * 0.5f,   0, 1, 1, 0 },  // Right: flip Y
  };

  glBindFramebuffer(GL_FRAMEBUFFER, 0);
  glViewport(0, 0, w, h);
  glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

  glDisable(GL_DEPTH_TEST);
  glUseProgram(m_holoShader);

  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, m_holoTex);
  glUniform1i(glGetUniformLocation(m_holoShader, "uTexture"), 0);

  glBindVertexArray(m_holoQuadVAO);
  glBindBuffer(GL_ARRAY_BUFFER, m_holoQuadVBO);

  for (auto& f : faces) {
    // Convert pixel coords to NDC [-1, 1]
    float x0 = (f.px / w) * 2.0f - 1.0f;
    float y0 = (f.py / h) * 2.0f - 1.0f;
    float x1 = ((f.px + baseSize) / w) * 2.0f - 1.0f;
    float y1 = ((f.py + baseSize) / h) * 2.0f - 1.0f;

    float quad[] = {
      x0, y0,  f.u0, f.v0,
      x1, y0,  f.u1, f.v0,
      x1, y1,  f.u1, f.v1,
      x0, y0,  f.u0, f.v0,
      x1, y1,  f.u1, f.v1,
      x0, y1,  f.u0, f.v1,
    };
    glBufferSubData(GL_ARRAY_BUFFER, 0, sizeof(quad), quad);
    glDrawArrays(GL_TRIANGLES, 0, 6);
  }

  glBindVertexArray(0);
  glUseProgram(0);
  glEnable(GL_DEPTH_TEST);
}

void Application::renderQuadView(float /*dt*/) {
  // Legacy stub — hologram mode now uses FBO capture + blitHologram()
}

void Application::shutdown() {
  if (m_gestureInput) m_gestureInput->stop();
  if (m_blankCursor) {
    glfwDestroyCursor(m_blankCursor);
    m_blankCursor = nullptr;
  }
  if (m_holoFBO) {
    glDeleteFramebuffers(1, &m_holoFBO);
    glDeleteTextures(1, &m_holoTex);
    glDeleteRenderbuffers(1, &m_holoDepthRBO);
    m_holoFBO = 0;
  }
  if (m_holoShader) {
    glDeleteProgram(m_holoShader);
    m_holoShader = 0;
  }
  if (m_holoQuadVAO) {
    glDeleteVertexArrays(1, &m_holoQuadVAO);
    glDeleteBuffers(1, &m_holoQuadVBO);
    m_holoQuadVAO = 0;
  }
  m_gestureInput.reset();
  m_galaxy.reset();
  m_ui.reset();
  m_renderer.reset();
  m_camera.reset();
  m_window.reset();
}

void Application::loadExoplanetIntoSimulation(const ExoplanetData& exo) {
  LOG_INFO("Loading exoplanet {} into simulation", exo.name);

  PlanetParams params =
      ExoplanetConverter::toPlanetParams(exo, m_inferenceEngine.get());

  SystemConfig config;
  config.name = exo.name + " System";
  config.description = "Exoplanet from NASA Archive";
  config.source = "nasa_tap";
  config.visualScale = 1.0;

  float visualPlanetRadius = params.radius;
  float visualStarRadius = visualPlanetRadius * 8.0f;
  float starDistance = visualPlanetRadius * 40.0f;

  BodyConfig star;
  star.name = exo.host_star.name.empty() ? "Host Star" : exo.host_star.name;
  star.type = "Star";
  star.mass = constants::SOLAR_MASS;
  star.radius = visualStarRadius;
  star.position = {starDistance, starDistance * 0.3, -starDistance * 0.2};
  star.velocity = {0.0, 0.0, 0.0};
  star.rotationPeriod = 25.0 * constants::DAY;
  config.bodies.push_back(star);

  BodyConfig planet;
  planet.name = exo.name;
  planet.type = "Planet";
  planet.mass = exo.mass_earth.hasValue()
                    ? exo.mass_earth.value * constants::EARTH_MASS
                    : constants::EARTH_MASS;
  planet.radius = visualPlanetRadius;
  planet.position = {0.0, 0.0, 0.0};
  planet.velocity = {0.0, 0.0, 0.0};
  planet.rotationPeriod = constants::DAY;
  config.bodies.push_back(planet);

  m_simulation.loadFromConfig(config);

  for (const auto& body : m_simulation.world().bodies()) {
    if (body->type() == BodyType::Planet) {
      m_simulation.setBodyAppearance(body->id(), params);
      m_simulation.setSelectedBody(body->id());
      m_simulation.setFocusBody(body->id());
      m_renderer->params() = params;
      break;
    }
  }

  m_simulation.pause();
  m_renderer->clearRings();
}

}  // namespace astrocore
