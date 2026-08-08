cmake_minimum_required(VERSION 3.8)
project(appboard-wla VERSION 1.0.0 LANGUAGES C)

include(GNUInstallDirs)

find_program(NPM_EXECUTABLE npm REQUIRED)
mark_as_advanced(NPM_EXECUTABLE)

if (WIN32)
  set(NPM_PREFIX "cmd" "/c")
endif ()

find_package(LibNetQ REQUIRED)

option(APPBOARD_INSTALL_SERVER "Install the appboard server" ON)
option(APPBOARD_INSTALL_MODULE "Install the appboard module" ON)
option(APPBOARD_INSTALL_ASSETS "Install appboard supporting assets" ON)

set(APPBOARD_BASE_URL "/" CACHE STRING "URL path prefix the appboard module is served under (a trailing slash is appended if missing)")
set(APPBOARD_ROOT_URL "${APPBOARD_BASE_URL}")
if(NOT APPBOARD_ROOT_URL MATCHES "/$")
  set(APPBOARD_ROOT_URL "${APPBOARD_ROOT_URL}/")
endif()

set(APPBOARD_SERVICE_URL "${APPBOARD_ROOT_URL}api/applications")
set(APPBOARD_ASSETS_DIR "${CMAKE_INSTALL_DATADIR}/${PROJECT_NAME}")

set(APPBOARD_DATAFILES
  config.h.in
  )

file(GLOB_RECURSE APPBOARD_TSXFILES
  "src/*.ts"
  "src/*.tsx"
  )

set(APPBOARD_DISTFILES
  dist/index.html
  dist/manifest.json
  )

add_custom_command(
  COMMAND ${NPM_PREFIX} "${NPM_EXECUTABLE}" install
  COMMAND ${NPM_PREFIX} "${NPM_EXECUTABLE}" run build --base-url=${APPBOARD_BASE_URL}
  DEPENDS package.json ${APPBOARD_TSXFILES}
  OUTPUT ${APPBOARD_DISTFILES}
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  )

configure_file(config.h.in "${CMAKE_CURRENT_BINARY_DIR}/config.h" @ONLY)

source_group(TREE "${CMAKE_CURRENT_SOURCE_DIR}" FILES module.c ${APPBOARD_DATAFILES} ${APPBOARD_DISTFILES})
add_library(appboard_wla SHARED module.c ${APPBOARD_DATAFILES} ${APPBOARD_DISTFILES})
target_include_directories(appboard_wla PRIVATE "$<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>")
target_link_libraries(appboard_wla PUBLIC LibNetQ::LibNetQ)
set_property(TARGET appboard_wla PROPERTY POSITION_INDEPENDENT_CODE ON)
set_target_properties(appboard_wla PROPERTIES PREFIX "" IMPORT_PREFIX "")

source_group(TREE "${CMAKE_CURRENT_SOURCE_DIR}" FILES server.c)
add_executable(appboard_server server.c)
target_link_libraries(appboard_server PRIVATE LibNetQ::LibNetQ)

if (CMAKE_C_COMPILER_ID MATCHES "^(GNU|Clang)$")
  target_link_options(appboard_server PRIVATE "-Wl,-rpath,$ORIGIN/../lib")
endif ()

if (APPBOARD_INSTALL_SERVER)
  install(TARGETS appboard_server
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    )
endif ()

if (APPBOARD_INSTALL_MODULE)
  install(TARGETS appboard_wla
    LIBRARY DESTINATION ${CMAKE_INSTALL_BINDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    )
endif ()

if (APPBOARD_INSTALL_ASSETS)
  install(DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist/"
    DESTINATION "${APPBOARD_ASSETS_DIR}"
    )
endif ()
